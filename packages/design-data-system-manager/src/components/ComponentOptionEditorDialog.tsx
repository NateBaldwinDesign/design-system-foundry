import React from 'react';
import { BaseEditorDialog, NameFormControl, DescriptionFormControl } from './shared/BaseEditorDialog';

export interface ComponentOptionEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  optionForm: {
    id: string;
    displayName: string;
    description: string;
  };
  handleOptionFormChange: (field: string, value: string) => void;
  optionEditIndex: number | null;
}

export const ComponentOptionEditorDialog: React.FC<ComponentOptionEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  optionForm,
  handleOptionFormChange,
  optionEditIndex,
}) => {
  const title = optionEditIndex !== null ? 'Edit Option' : 'Add Option';

  return (
    <BaseEditorDialog
      open={open}
      onClose={onClose}
      onSave={onSave}
      title={title}
    >
      <NameFormControl
        value={optionForm.displayName}
        onChange={(value) => handleOptionFormChange('displayName', value)}
      />
      
      <DescriptionFormControl
        value={optionForm.description}
        onChange={(value) => handleOptionFormChange('description', value)}
      />
    </BaseEditorDialog>
  );
}; 