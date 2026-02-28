---
description: Feature that allows to determine the most relevant time frame to query relevant articles 
---

- use the newmatics index api, specifically the /articles/counts endpoint
- this is administered under new endpoint "get relevant timeframes"
- use reasonably distinct periods (e.g. monthly) for up to 5 years to history from now on
- the UI would create a graph of this distribution
- alorithmically identify the periods with large volume of articles and suggest to the user to use these
- user can in the next step enter such  periods in the UI
- based on these periods, adjust how you query the @newsmatics endpoint