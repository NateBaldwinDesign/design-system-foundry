import { getValueTypeFromId, getValueTypeIdFromType } from '../utils/valueTypeUtils';

// ... existing code ...

// In the ValueTypeForm component
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!name || !id) return;

  const typeId = type ? getValueTypeIdFromType(type, schema.resolvedValueTypes) : undefined;
  
  const newValueType: ResolvedValueType = {
    id,
    displayName: name,
    ...(typeId && { type: typeId }),
    ...(description && { description }),
  };

  onSave(newValueType);
  onClose();
};

// ... existing code ...

// In the ValueTypeList component
const valueTypeType = getValueTypeFromId(valueType.id, schema.resolvedValueTypes);

// ... existing code ... 