

async walker get_finetuned_models{
    obj __specs__ {
        static has path: str = "/models", methods: list = ["get"];
    }
}

async walker load_finetuned_models{
    obj __specs__ {
        static has path: str = "/load-model", methods: list = ["post"];
    }
}

async walker process_inference{
    obj __specs__ {
        static has path: str = "/process", methods: list = ["post"];
    }
}

async walker process_unfinetuned_vqa_endpoint {
    obj __specs__ {
        static has path: str = "/process_vqa/unfinetuned", methods: list = ["post"];
    }
}

async walker compare_responses_endpoint {
    obj __specs__ {
        static has path: str = "/compare_responses", methods: list = ["post"];
    }
}