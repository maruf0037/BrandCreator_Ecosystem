import autogen

# আপনার রিমোট সার্ভারের কনফিগারেশন
llm_config = {
    "config_list": [
        {
            "model": "qwen2.5",  # এখানে আপনার সার্ভারের মডেলের নামটি দিন (যেমন: qwen2.5)
            "base_url": "http://100.73.198.50:11434/v1",
            "api_key": "ollama", 
        }
    ]
}

# অ্যাসিস্ট্যান্ট এজেন্ট তৈরি (যে ব্রেন হিসেবে কাজ করবে এবং উত্তর দেবে)
assistant = autogen.AssistantAgent(
    name="Assistant",
    llm_config=llm_config
)

# ইউজার প্রক্সি এজেন্ট তৈরি (যে আপনার হয়ে প্রশ্ন করবে)
user_proxy = autogen.UserProxyAgent(
    name="User",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=1,
    code_execution_config={"use_docker": False}
)

# চ্যাট শুরু করার কমান্ড
user_proxy.initiate_chat(
    assistant,
    message="Tell me a very short joke about programmers."
)