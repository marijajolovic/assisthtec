from fastapi import FastAPI
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from peft import PeftModel

app = FastAPI()

MODEL="bigcode/starcoderbase-1b" # Model checkpoint on the Hugging Face Hub
OUTPUT_DIR="peft-starcoder-lora-a100"
SEED=0

tokenizer = AutoTokenizer.from_pretrained(MODEL, trust_remote_code=True)
base_model = AutoModelForCausalLM.from_pretrained(
    MODEL,
    quantization_config=None,
    device_map=None,
    trust_remote_code=True,
    torch_dtype=torch.bfloat16,
)

peft_model_id = f"marijajolovic/{OUTPUT_DIR}"
model = PeftModel.from_pretrained(base_model, peft_model_id)
model.merge_and_unload()

def get_code_completion(prefix, suffix):
    text = f"""<fim_prefix>{prefix}<fim_suffix>{suffix}<fim_middle>"""
    model.eval()
    outputs = model.generate(
        input_ids=tokenizer(text, return_tensors="pt").input_ids,
        max_new_tokens=128,
        temperature=0.2,
        top_k=50,
        top_p=0.95,
        do_sample=True,
        repetition_penalty=1.0,
    )
    #return tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
    generated_text = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
    
    # Remove the prefix from the generated text
    generated_text = generated_text[len(prefix):]
    
    return generated_text.strip()

@app.post("/predict")
async def predict(input_text: str):
    prediction = ""
    return {"predicted_text": get_code_completion(input_text, prediction)}


