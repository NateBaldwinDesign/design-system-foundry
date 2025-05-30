  <TokensTab
    tokens={tokens}
    collections={collections}
    dimensions={dimensions}
    platforms={platforms}
    onEdit={handleEditToken}
    onDelete={onDeleteToken}
    taxonomies={taxonomies}
    resolvedValueTypes={resolvedValueTypes}
    onViewClassifications={handleViewClassifications}
    renderAddTokenButton={
      <Button colorScheme="blue" size="sm" onClick={handleAddToken} leftIcon={<LuPlus />}>
        Add Token
      </Button>
    }
  /> 