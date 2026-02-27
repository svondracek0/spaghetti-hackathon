---
description: Workflow aiming at the interaction between frontend and backend
---

Adjust the app so that backend interacts with frontend in the following manner:
- user enters the opponent, setup of the debate and its format
- user enters topics for the discussion, for each topic there will be a separate search of the newsmatics API
- based on the user input, an API call to the newsmatics API is made
- the newsmatics API returns pool of relevant articles for each topic including text
- based on this api input, an LLM generates relevant questions that person could ask his opponent