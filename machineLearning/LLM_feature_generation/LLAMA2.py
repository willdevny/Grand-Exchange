import gc
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import os
import pandas as pd

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

token = "INSERT_HF_TOKEN"
model_id = "meta-llama/Meta-Llama-3-8B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(model_id, token=token)

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map="auto",
    token=token,
    quantization_config=BitsAndBytesConfig(load_in_4bit=True)
)
model.generation_config.max_length = None

def generate_response(text, directions):
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
            max_new_tokens=400,
            temperature=0.8,
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

directions = f"""
You are a financial analyst extracting stock signals from an earnings call.

Company ticker: {ticker}

TASK:
Extract ONLY high-signal stock indicators from the transcript.

OUTPUT FORMAT:
- Bullet points only using "-"
- No explanations, no extra text

CONTENT RULES:
- Focus on information that impacts stock price
- Prefer directional language: (increase, decrease, strong, weak, improving, deteriorating)
- If no information was included return a single empty bullet point
- Be as concise as possible while retaining all key details.
- Do not return lines like "- no guidance was discussed"

STRICTLY AVOID:
- Generic summaries
- Rewriting sentences from transcript
- Opinions or assumptions

"""

directions2 = f"""
You are a financial analyst that is rating stock signals. You are given bullet points extracted from an earnings call transcript from {ticker}.
TASK: Assign a single integer score from -5 to 5 based on expected stock impact.

SCALE:
-5 = Very strong negative signal (stock price decline likely)
0 = neutral/mixed/unclear
5 = Very strong positive signal (stock price increase likely)

RULES:
- Weigh strong signals more than weak ones
- Negative signals outweigh positive if risk is significant
- Ignore duplicated bullets
- Do NOT explain your answer
- Do NOT return any text other than a single integer
- Ignore lines that say things like no guidance was discussed.


EXAMPLES:

Input 1:
- Strong demand
- Margins increased
- Revenue growth

Output 1: 3

Input 2:
- Low demand
- Margins compressed
- Revenue decrease

Output 2: -3
"""



#process the files
df = pd.DataFrame(columns = ['LLM_feature'])
folder_path = f"~/llama/call_transcripts/{ticker}_call_transcripts/"
folder_path = os.path.expanduser(folder_path)
for filename in os.listdir(folder_path):
    file_path = os.path.join(folder_path, filename)

    summary = ''

    with open(file_path, "r") as f:
        call_trans = f.read()
    transcript_chunks = call_trans.split("\n")

    for i, chunk in enumerate(transcript_chunks):
        if len(chunk) > 35000:
            continue
        if len(chunk.strip()) < 20:
            continue

        resp = generate_response(chunk, directions)
        if resp != 'NONE' and resp != '-' and resp != '- ' and ('-  ' not in resp):
            print(resp)
            summary += resp
    print(summary)
    score = generate_response(summary, directions2)
    print(score)
    df.loc[len(df), 'LLM_feature'] = score

save_path = f'/llama/processed_transcripts2/{ticker}_features.csv'
df_final.to_csv(save_path, index=False)
