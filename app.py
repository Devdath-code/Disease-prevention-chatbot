from flask import Flask, render_template, request, jsonify, send_from_directory
import google.generativeai as genai
from google.generativeai import types
import json
import re
import os
from datetime import datetime

app = Flask(__name__)

# Configure API key - better to use environment variables
key = 'AIzaSyDOWWDQ8IPCmbfDfag19mvuI4YiJY6o6lc'  # Replace with your actual Gemini API key
genai.configure(api_key=key)

# Configure model
generation_config = types.GenerationConfig(
    temperature=0.7,
    top_p=1,
    top_k=1,
    max_output_tokens=500
)

model = genai.GenerativeModel('gemini-2.0-flash', generation_config=generation_config)

# Chat history storage
chat_history = {}

def get_diagnosis(user_input, session_id):
    prompt = f"""
    {user_input}

    Based on these symptoms, provide a likely diagnosis that is also low hazardous.
    Also provide a list of precautions for this diagnosis.
    Then, provide a possible alternative diagnosis, but state that it is less likely.

    Output the response in JSON format.

    Example JSON output:
    {{
        "primary_diagnosis": {{
            "disease_name": "Example Disease",
            "precautions": ["Example precaution 1", "Example precaution 2"]
        }},
        "possible_alternative": {{
            "disease_name": "Another Example Disease",
            "disclaimer": "This is a possible alternative, but it is less likely."
        }}
    }}

    JSON Output:
    """

    # Store the interaction in chat history
    if session_id not in chat_history:
        chat_history[session_id] = []
    
    chat_history[session_id].append({
        "role": "user",
        "content": user_input,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

    try:
        response = model.generate_content(
            contents=[prompt],
            generation_config=generation_config,
        )

        json_string = re.sub(r'```json\s*', '', response.text)
        json_string = re.sub(r'```\s*$', '', json_string)

        json_response = json.loads(json_string)
        
        # Store the bot response in chat history
        chat_history[session_id].append({
            "role": "bot",
            "content": json_response,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        
        return json_response
    except Exception as e:
        error_response = {
            "error": True,
            "message": f"Error processing your request: {str(e)}"
        }
        
        chat_history[session_id].append({
            "role": "bot",
            "content": error_response,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        
        return error_response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/diagnose', methods=['POST'])
def diagnose():
    data = request.get_json()
    user_input = data.get('message', '')
    session_id = data.get('session_id', 'default_session')
    
    diagnosis = get_diagnosis(user_input, session_id)
    return jsonify(diagnosis)

@app.route('/api/history', methods=['GET'])
def get_history():
    session_id = request.args.get('session_id', 'default_session')
    if session_id in chat_history:
        return jsonify(chat_history[session_id])
    return jsonify([])

@app.route('/api/clear_history', methods=['POST'])
def clear_history():
    data = request.get_json()
    session_id = data.get('session_id', 'default_session')
    
    if session_id in chat_history:
        chat_history[session_id] = []
    
    return jsonify({"status": "success", "message": "Chat history cleared"})

if __name__ == '__main__':
    app.run(debug=False)  # Change this from True to False

