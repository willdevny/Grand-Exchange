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
            max_new_tokens=5,
            temperature=0.2,
            pad_token_id=tokenizer.eos_token_id
        )

    generated_tokens = response[0][inputs["input_ids"].shape[-1]:]
    result = tokenizer.decode(generated_tokens, skip_special_tokens=True)

    # clear data on gpu
    del inputs, response, generated_tokens
    torch.cuda.empty_cache()
    gc.collect()

    return result

ticker = "DD"

directions30 = f"""You are a senior equity research analyst specializing in equity markets.

You will receive a single excerpt from an earnings call transcript for {ticker}. Your task is to assess the sentiment and information in the provided text and return an integer scoring its likely impact on the 30 day returns.

Scoring scale:
  -2 = strongly negative impact (significant sell signal)
  -1 = mildly to moderately negative
  0 = neutral / no meaningful impact
  1 = mildly to moderately positive
  2 = strongly positive impact (significant buy signal)

Rules:
- Score ONLY based on the excerpt provided. Do not assume information not present.
- Output ONLY the score in the exact format below. No preamble, no explanation, no punctuation outside the format.
- If there is not input text, then output "NONE"

Output format (exactly): int"""

directions60 = f"""You are a senior equity research analyst specializing in equity markets.

You will receive a single excerpt from an earnings call transcript for {ticker}. Your task is to assess the sentiment and information in the provided text and return an integer scoring its likely impact on the 60 day returns.

Scoring scale:
  -2 = strongly negative impact (significant sell signal)
  -1 = mildly to moderately negative
  0 = neutral / no meaningful impact
  1 = mildly to moderately positive
  2 = strongly positive impact (significant buy signal)

Rules:
- Score ONLY based on the excerpt provided. Do not assume information not present.
- Output ONLY the score in the exact format below. No preamble, no explanation, no punctuation outside the format.
- If there is not input text, then output "NONE"

Output format (exactly): int"""

directions90 = f"""You are a senior equity research analyst specializing in equity markets.

You will receive a single excerpt from an earnings call transcript for {ticker}. Your task is to assess the sentiment and information in the provided text and return an integer scoring its likely impact on the 90 day returns.

Scoring scale:
  -2 = strongly negative impact (significant sell signal)
  -1 = mildly to moderately negative
  0 = neutral / no meaningful impact
  1 = mildly to moderately positive
  2 = strongly positive impact (significant buy signal)

Rules:
- Score ONLY based on the excerpt provided. Do not assume information not present.
- Output ONLY the score in the exact format below. No preamble, no explanation, no punctuation outside the format.
- If there is not input text, then output "NONE"

Output format (exactly): int"""


directions_list = [directions30, directions60, directions90]
df_final = pd.DataFrame(columns = ['30day','60day','90day'])

#process the files
ticker = "DD"
folder_path = f"~/llama/call_transcripts/{ticker}_call_transcripts/"
folder_path = os.path.expanduser(folder_path)
for filename in os.listdir(folder_path):
    LLM_features = pd.DataFrame(columns = ['30day','60day','90day'])
    file_path = os.path.join(folder_path, filename)

    with open(file_path, "r") as f:
        call_trans = f.read()
    transcript_chunks = call_trans.split("\n")

    for i, chunk in enumerate(transcript_chunks):
        if len(chunk) > 35000:
            continue
        if len(chunk.strip()) < 20:
            continue

        row = {}
        for j,direction in enumerate(directions_list):
            resp = generate_response(chunk, direction)
            if resp != 'NONE':
                print(resp)
                row[['30day','60day','90day'][j]] = int(resp.strip())

        LLM_features.loc[len(LLM_features)] = row
    df_final.loc[len(df_final)] = LLM_features.mean()
    print(LLM_features.mean())

save_path = f'/llama/processed_transcripts/{ticker}_features.csv'
df_final.to_csv(save_path, index=False)
