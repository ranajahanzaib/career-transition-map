# Skill modeling

O\*NET rating tables use named elements and scale identifiers. Preserve both element IDs and rating scale metadata. Importance and level are not interchangeable; normalize only comparable measures using documented bounds. Missing ratings remain null, not zero.

Cosine similarity can compare aligned occupational profile vectors. Report comparable-feature coverage alongside each score and allow dimensions to remain independently selectable. Label the result **occupational profile similarity**: a score does not indicate that an individual possesses the listed skills or can transition without training.

Directional skill gaps require comparable level ratings and are not inferred from importance ratings. The current release publishes O\*NET profiles but does not include profile-similarity scores or directional skill-gap estimates.
