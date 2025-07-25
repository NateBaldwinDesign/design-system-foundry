# User Experience Use Cases
This is a list of UX workflows that must be tested and validated in order to ensure the web application is functioning properly in detail.

## Platform management
1. **Create new platform**: Visit Platforms page, select "Add Platform". Add platform dialog opens.
    a. **Linked source**: Follow the "Linking existing source" worfklow
    b. **New local file**: Follow the "Creating new local extension file" workflow
    c. **New repository**: Follow the "Creating a new repository" workflow
2. **Edit existing platform**: Visit Platforms page, select "Edit" on an existing platform. Edit platform dialog opens.
    a. **Changing linked source** 
        - Click "Select new source source"
        i. **Linked source**: Follow the "Linking existing source" worfklow
        ii. **New local file**: Follow the "Creating new local extension file" workflow
        iii. **New repository**: Follow the "Creating a new repository" workflow
2. **Linking existing source** 
    - Select "Link Existing Extension". 
    - Select the Organization, Repository, Branch, and File within the Repository settings.
    - Click Next
    - Review and edit display name and description
    - Review (view only) the platform ID and system ID **PLATFORM ID IS CURRENTLY EDITABLE**
    - Click Next
    - Review (view only) the syntax patterns and value formatters
    - Click "Link platform"
    - See new platform in the Platform View
4. **Creating new local extension file**
    - Select "Create Extension File". 
    - Provide a name in the File Name field
    - Click Next
    - Review and edit display name and description
    - Review (view only) the platform ID and system ID
    - Click Next
    - Review and edit the syntax patterns and value formatters
    - Click "Create platform extension file"
    - See new platform in the Platform View
5. **Creating a new repository**
    - Select "Create New Repository". 
    - Provide a name and description for the repository, and choose its visibility (public or private)
    - Click Next
    - Review and edit display name and description
    - Review (view only) the platform ID and system ID
    - Click Next
    - Review and edit the syntax patterns and value formatters
    - Click "Create repository & platform extension"
    - See new platform in the Platform View

## Theme management

## Dimension management

## Taxonomy management

## Figma management

## Value types management

## Token management