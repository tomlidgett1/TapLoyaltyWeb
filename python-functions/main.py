import os
import json
from flask import Request, jsonify, make_response
from google.cloud import secretmanager
from composio_openai import ComposioToolSet, App
from composio import ComposioToolSet as BaseComposioToolSet
from openai import OpenAI
from typing import Dict, Any

# Helper to fetch secrets from Secret Manager with hardcoded project ID
def get_secret(name: str) -> str:
    print(f"[DEBUG] Getting secret: {name}")
    project_id = "tap-loyalty-fb6d0"  # hardcoded project ID
    secret_path = f"projects/{project_id}/secrets/{name}/versions/latest"
    print(f"[DEBUG] Secret path: {secret_path}")
    client = secretmanager.SecretManagerServiceClient()
    response = client.access_secret_version(request={"name": secret_path})
    print(f"[DEBUG] Successfully retrieved secret: {name}")
    return response.payload.data.decode("UTF-8")

# Core agent execution logic
def execute_ai_agent_task(
    prompt: str,
    merchant_id: str,
    openai_client: OpenAI,
    toolset: ComposioToolSet,
    base_toolset: BaseComposioToolSet
) -> Dict[str, Any]:
    print(f"[DEBUG] Starting execute_ai_agent_task with prompt: '{prompt}', merchant_id: '{merchant_id}'")
    
    if not prompt or not merchant_id:
        print("[DEBUG] Missing prompt or merchant_id")
        return {"success": False, "error": "Both 'prompt' and 'merchant_id' are required."}
    
    try:
        print("[DEBUG] Step 1: Discovering connected apps")
        # Step 1: Discover connected apps
        try:
            connected_accounts = base_toolset.get_connected_accounts()
            available_apps = [acc.appName for acc in connected_accounts if acc.status == "ACTIVE"]
            print(f"[DEBUG] Found {len(available_apps)} connected apps: {available_apps}")
        except Exception as e:
            print(f"[DEBUG] Error getting connected accounts: {str(e)}")
            available_apps = []

        print("[DEBUG] Step 2: Finding relevant actions")
        # Step 2: Find relevant actions
        try:
            relevant_actions = toolset.find_actions_by_use_case(use_case=prompt)
            print(f"[DEBUG] Found {len(relevant_actions)} relevant actions: {relevant_actions}")
        except Exception as e:
            print(f"[DEBUG] Error finding relevant actions: {str(e)}")
            relevant_actions = []

        print("[DEBUG] Step 3: Loading tool definitions")
        # Step 3: Load tool definitions
        tools = []
        if relevant_actions:
            print(f"[DEBUG] Getting tools for {len(relevant_actions)} relevant actions")
            tools = toolset.get_tools(actions=relevant_actions)
            print(f"[DEBUG] Got {len(tools)} tools from relevant actions")
        else:
            print("[DEBUG] No relevant actions found, trying to get tools by apps")
            app_enums = []
            for app_name in set(available_apps):
                member = App.__members__.get(app_name.upper())
                if member:
                    app_enums.append(member)
                    print(f"[DEBUG] Added app enum for: {app_name}")
            
            if app_enums:
                print(f"[DEBUG] Getting tools for {len(app_enums)} app enums")
                tools = toolset.get_tools(apps=app_enums)
                print(f"[DEBUG] Got {len(tools)} tools from apps")

        if not tools:
            print("[DEBUG] No tools found, returning error")
            return {"success": False, "error": "No relevant tools found.", "merchant_id": merchant_id, "prompt": prompt}

        print(f"[DEBUG] Step 4: Sending request to LLM with {len(tools)} tools")
        # Step 4: Send request to LLM with tools
        messages = [
            {"role": "system", "content": f"You are an AI assistant for merchant {merchant_id}. Use their connected tools."},
            {"role": "user", "content": prompt}
        ]
        print(f"[DEBUG] Messages prepared: {messages}")
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )
        resp_msg = response.choices[0].message
        print(f"[DEBUG] LLM response received. Has tool calls: {hasattr(resp_msg, 'tool_calls') and resp_msg.tool_calls is not None}")

        print("[DEBUG] Step 5: Handling tool calls")
        # Step 5: Handle tool calls
        execution_results = []
        if getattr(resp_msg, 'tool_calls', None):
            print(f"[DEBUG] Processing {len(resp_msg.tool_calls)} tool calls")
            for i, call in enumerate(resp_msg.tool_calls):
                print(f"[DEBUG] Tool call {i}: {call.function.name} with args: {call.function.arguments}")
            
            result = toolset.handle_tool_calls(response)
            execution_results = result if isinstance(result, list) else [result]
            print(f"[DEBUG] Tool execution results: {execution_results}")
            
            messages.append(resp_msg)
            for idx, call in enumerate(resp_msg.tool_calls):
                payload = execution_results[idx] if idx < len(execution_results) else {"error": "No result"}
                messages.append({"role": "tool", "content": json.dumps(payload), "tool_call_id": call.id})
                print(f"[DEBUG] Added tool result {idx} to messages")
            
            print("[DEBUG] Sending final request to LLM with tool results")
            final_llm = openai_client.chat.completions.create(model="gpt-4o-mini", messages=messages)
            final_response = final_llm.choices[0].message.content
            print(f"[DEBUG] Final LLM response: {final_response}")
        else:
            print("[DEBUG] No tool calls, using direct response")
            final_response = resp_msg.content

        result = {
            "success": True,
            "merchant_id": merchant_id,
            "prompt": prompt,
            "available_apps": available_apps,
            "tools_used": len(getattr(resp_msg, 'tool_calls', [])),
            "tool_calls": [
                {"function": tc.function.name, "arguments": json.loads(tc.function.arguments)}
                for tc in getattr(resp_msg, 'tool_calls', [])
            ],
            "execution_results": execution_results,
            "final_response": final_response,
            "total_tools_available": len(tools)
        }
        print(f"[DEBUG] Returning successful result: {result}")
        return result
        
    except Exception as e:
        print(f"[DEBUG] Exception in execute_ai_agent_task: {str(e)}")
        return {"success": False, "error": str(e), "merchant_id": merchant_id, "prompt": prompt}

# HTTP Cloud Function entry point with CORS handling
def ai_agent(request: Request):
    print(f"[DEBUG] ai_agent function called with method: {request.method}")
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        print("[DEBUG] Handling CORS preflight request")
        response = make_response('', 204)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST,OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    print("[DEBUG] Parsing JSON request data")
    # Parse JSON
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt', '')
    merchant_id = data.get('merchant_id', '')
    
    print(f"[DEBUG] Parsed data - prompt: '{prompt}', merchant_id: '{merchant_id}'")
    print(f"[DEBUG] Full request data: {data}")

    print("[DEBUG] Fetching secrets")
    # Fetch secrets
    try:
        OPENAI_KEY = get_secret('OPENAI_API_KEY')
        COMPOSIO_KEY = get_secret('COMPOSIO_API_KEY')
        print("[DEBUG] Successfully fetched all secrets")
    except Exception as e:
        print(f"[DEBUG] Error fetching secrets: {str(e)}")
        resp = jsonify({"success": False, "error": f"Failed to fetch secrets: {str(e)}"})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp

    print("[DEBUG] Initialising clients")
    # Initialize clients
    openai_client = OpenAI(api_key=OPENAI_KEY)
    toolset = ComposioToolSet(api_key=COMPOSIO_KEY, entity_id=merchant_id)
    base_toolset = BaseComposioToolSet(api_key=COMPOSIO_KEY, entity_id=merchant_id)
    print("[DEBUG] Clients initialised successfully")

    print("[DEBUG] Executing AI agent task")
    # Execute task
    result = execute_ai_agent_task(prompt, merchant_id, openai_client, toolset, base_toolset)
    print(f"[DEBUG] Task execution completed with result: {result}")

    print("[DEBUG] Preparing response")
    # Return JSON with CORS header
    resp = jsonify(result)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    print("[DEBUG] Response prepared and returning")
    return resp
