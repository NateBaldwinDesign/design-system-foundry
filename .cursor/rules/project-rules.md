# Project rules

## JSON Schema dependent
The primary purpose of this project is to create and validate a data model / schema for complex data management. Because of this, cursor should always:
1. Rely on data-model/src/schema.json as the source of truth
2. Model any application logic or other forms of schama on the schema.json file
3. Ensure validation can be perfomed in any UI or test environment
4. Never introduce new or alternative models, keys, properties, or other objects that could otherwise be leveraged from the schema
5. Schema.ts should be a direct 1:1 correlate with schema.json, aside from optimizations or conventions natural to typescript
6. Any deviations of schema.ts from schema.json should not fragment from the specific intent behind schema.json, and should solely be for formatting or functionality purposes
7. Every prompt should be evaluated for any request or result that could have an effect or dependency on the JSON schema (and typescript schema). These impacts should be included in the response and evaluation of a solution proposed by the agent.

## Schema development
The purpose of the schema is to represent a clear and flexible data system. Because of this, the schema itself should:
1. Be clear and concise
2. Avoid hierarchies or nested structures that may overcomplicate the data
3. Avoid over-flattening or abstracting the data, which may lose important relationships between elements
4. Ensure the schema is as flexible and scalable as possible
5. Ensure the schema can be used effectively as a stable form of data

## Web application
The web app is primarily built as a method of validating the schema with example data, and demonstrating the capabilities of using the robust schema and data for solving complex data challenges. 

### Feature development
1. Always rely on the schema (data-model/src/schema.json) for things such as:
  a. Organizing data
  b. Understanding relationships between values and other data
  c. Identifying opportunity for new features (based on available data)
  d. Organizing elements of the user interface
2. Build in validation for editable fields, based on known constraints within the schema or the data itself
3. Never assume functionality, organization, or relationships between UI elements that are based on the data unless the assumption is directly tied to insights and understanding from the source schema.json itself

### Code formatting
- Modularize functions into separate files for clarity of code
- Comment inline to assist in code comprehension for humans

### User interface
- In some cases, alternative information organization may be requested in order to make an interface that is more user friendly.
- Favor user friendliness over exactness with the schema when looking at complex relationships, such as platformOverrides.
- Leverage pre-existing components
- Only build custom components when necessary
- For any color or contrast related functions, use functions that are available in Colorjs.io node package from npm. Do not create custom color functions.