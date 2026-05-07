import gc
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import os
import pandas as pd

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

token = "INSERT_HF_TOKEN"
model_id = "meta-llama/Meta-Llama-3.1-8B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(model_id, token=token)

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map="auto",
    token=token,
    quantization_config=BitsAndBytesConfig(load_in_4bit=True)
)
model.generation_config.max_length = None

def generate_response(text, directions, t):
    messages = [
        {"role": "system", "content": directions},

        {"role": "user", "content": f"provided text:\n{text}"}
    ]

    formatted = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True)

    inputs = tokenizer(formatted, return_tensors="pt").to("cuda")

    with torch.no_grad():
        response = model.generate(
            **inputs,
            max_new_tokens=1000,
            temperature=t,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id
        )

    generated_tokens = response[0][inputs["input_ids"].shape[-1]:]
    result = tokenizer.decode(generated_tokens, skip_special_tokens=True)

    # clear data on gpu
    del inputs, response, generated_tokens
    torch.cuda.empty_cache()
    gc.collect()

    return result

ticker = "HAL"

compression_directions = """
You are a text compression assistant. You are recieving text please provide a summary of them text by removing filler.

Rules:
- Output the summary as a paragraph
- Do not include any additional text, such as "Here is the summary:", before the summary.
- If there is no text provided then output NONE
"""

extraction_directions = f"""
You are a text cleaner.

TASK:
Remove filler. Keep only concrete business information.

KEEP:
- Numbers, metrics, dates
- Financial results
- Guidance, forecasts
- Decisions, actions, plans
- Named entities (companies, products)

REMOVE:
- Greetings, thanks, introductions
- Repetition
- Vague statements (e.g., "we are excited", "strong position")
- Opinions without data

RULES:
- Do NOT summarize broadly
- Do NOT add new information
- Do NOT interpret
- Keep original wording when possible
- Shorten sentences instead of rewriting
- If no financial information is available, return exactly NONE
- Output plain text only. No explanations.

example)
INPUT:
"Good morning everyone, thank you for joining. We are very excited about this quarter. Revenue grew significantly and we feel confident going forward."

OUTPUT:
"Revenue grew significantly and the company is confident moving forward."
"""

seniment_directions = """
You are a text compression assistant. You are recieving text please provide a summary of them text by removing filler.

Rules:
- Output the summary as a paragraph
- Do not include any additional text, such as "Here is the summary:", before the summary.
- If there is no text provided then output NONE
"""

classify_directions = f"""
You are an expert stock analyst.

You are given key extracted points from an earnings call for the ticker: {ticker}.

TASK:
Classify the expected short-term stock reaction based ONLY on the provided classes.

LABELS (choose exactly one):
- very_bullish
- somewhat_bullish
- neutral
- somewhat_bearish
- very_bearish

DEFINITIONS:
- very_bullish: Strong growth, major beats, raised guidance, highly positive outlook
- somewhat_bullish: Mild growth, slight beats, cautiously optimistic tone
- neutral: Mixed signals, no clear directional bias
- somewhat_bearish: Minor misses, soft guidance, cautious/negative tone
- very_bearish: Significant misses, lowered guidance, strong negative outlook

RULES:
- Use ONLY the provided information.
- Do NOT assume missing information.
- Do NOT hedge between labels.
- Be decisive.

- You may internally reason about what content is meaningful, but DO NOT output your reasoning.


OUTPUT FORMAT (STRICT):
Return ONLY one label from the list above.
No extra text, no punctuation, no explanation.
"""


df_final = pd.DataFrame(columns = ['assignment'])
p = 0

#process the files
folder_path = f"~/llama/call_transcripts/{ticker}_call_transcripts/"
folder_path = os.path.expanduser(folder_path)
for filename in os.listdir(folder_path):
    file_path = os.path.join(folder_path, filename)

    summary = ''
    before = 0

    with open(file_path, "r") as f:
        call_trans = f.read()

    transcript_chunks = call_trans.split("\n")

    for i, chunk in enumerate(transcript_chunks):
        #if len(chunk) > 35000:
            #continue
        if len(chunk.strip()) < 20:
            continue
        resp1 = generate_response(chunk, compression_directions, 0.2).strip()
        if 'NONE' not in resp1:
            print(resp1)
            summary += resp1 + '\n'
            print(len(resp1))
            print(len(chunk))
            before += len(chunk)
    print('THIS IS THE SUMMARY**********************************************************************************')
    print(len(summary))
    print(before)
    print(summary)

    print('THIS IS KEY POINTS**********************************************************************************')
    resp2 = generate_response(summary, extraction_directions, 0.5).strip()
    if 'NONE' not in resp2:
        print(resp2)

    print('THIS IS FINAL PREDICTIONS**********************************************************************************')
    resp3 = generate_response(resp2, prediction_directions, 0.8).strip()
    print(resp3)
    if 'very_bullish' in resp3:
        df_final.loc[len(df_final), 'assignment'] = 2
    elif 'somewhat_bullish' in resp3:
        df_final.loc[len(df_final), 'assignment'] = 1
    elif 'somewhat_bearish' in resp3:
        df_final.loc[len(df_final), 'assignment'] = -1
    elif 'very_bearish' in resp3:
        df_final.loc[len(df_final), 'assignment'] = -2
    else:
        df_final.loc[len(df_final), 'assignment'] = 0
    p += 1
    if p%10 == 0:
        print(df_final)
    elif p == 29:
        break


print(df_final)
save_path = f'/llama/processed_transcripts/{ticker}_features.csv'
df_final.to_csv(save_path, index=False)
