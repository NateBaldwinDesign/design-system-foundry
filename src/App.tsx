  <TokensTab
    tokens={tokens}
    collections={collections}
    dimensions={dimensions}
    platforms={platforms}
    onEdit={(token: ExtendedToken) => {
      // handle edit
    }}
    onDelete={(tokenId: string) => setTokens(tokens.filter(t => t.id !== tokenId))}
    taxonomies={taxonomies}
    resolvedValueTypes={resolvedValueTypes}
    onViewClassifications={handleViewClassifications}
    renderAddTokenButton={
      <Button colorScheme="blue" size="sm" onClick={handleAddToken} leftIcon={<LuPlus />}>
        Add Token
      </Button>
    }
  /> 