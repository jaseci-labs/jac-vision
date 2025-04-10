instruction = "You are an expert damage assessment analyzer. Describe accurately what you see in this image."

def convert_to_conversation(sample):
    # if is_custom:
    return {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": instruction},
                    {"type": "image", "image": sample["image"]},
                ],
            },
            {
                "role": "assistant",
                "content": [{"type": "text", "text": sample["caption"]}],
            },
        ]
    }
    # else:
    #     return {
    #         "messages": [
    #             {
    #                 "role": "user",
    #                 "content": [
    #                     {"type": "text", "text": instruction},
    #                     {"type": "image", "image": sample["image"]},
    #                 ],
    #             },
    #             {
    #                 "role": "assistant",
    #                 "content": [{"type": "text", "text": sample["caption"]}],
    #             },
    #         ]
    #     }
