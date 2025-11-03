# SPUserField onChange Bug Fix

## Problem
The `handlePeoplePickerChange` callback in SPUserField uses `onChange` from props, which is undefined when using React Hook Form Controller. This causes user field values not to be saved.

## Root Cause
In `/node_modules/spfx-toolkit/lib/components/spFields/SPUserField/SPUserField.js`:

```javascript
var handlePeoplePickerChange = React.useCallback(function (items) {
    var principals = (0, SPUserField_utils_1.peoplePickerItemsToPrincipals)(items);
    debugger;
    var finalValue = allowMultiple ? principals : (principals.length > 0 ? principals[0] : null);
    setInternalValue(finalValue);
    if (onChange) {  // <--- onChange from props is undefined!
        onChange(finalValue);
    }
}, [allowMultiple, onChange]);
```

The `onChange` from props is undefined when using with Controller. The actual onChange is passed as `fieldOnChange` parameter to `renderField`, but `handlePeoplePickerChange` doesn't have access to it.

## Solution
Modify the `renderField` function to wrap `handlePeoplePickerChange` with the correct onChange:

### Find this code (around line 120-130):
```javascript
var renderField = function (fieldValue, fieldOnChange, fieldError) {
    if (!context_1.SPContext.context) {
        return (React.createElement(Stack_1.Stack, { className: containerClass },
            label && (React.createElement(Label_1.Label, { required: required, disabled: disabled }, label)),
            React.createElement(Text_1.Text, { style: { color: theme.palette.redDark } }, "SPContext not initialized. Please initialize SPContext before using SPUserField.")));
    }
    return (React.createElement(Stack_1.Stack, { className: "sp-user-field ".concat(containerClass, " ").concat(className || '') },
        label && (React.createElement(Label_1.Label, { required: required, disabled: disabled }, label)),
        description && (React.createElement(Text_1.Text, { variant: "small", style: { marginBottom: 4 } }, description)),
        React.createElement("div", { ref: fieldRef }, displayMode === SPUserField_types_1.SPUserFieldDisplayMode.PeoplePicker ? (React.createElement("div", { style: {
                border: fieldError ? '1px solid #a80000' : 'none',
                borderRadius: fieldError ? '2px' : '0',
                padding: fieldError ? '0' : '0'
            } },
            React.createElement(PeoplePicker_1.PeoplePicker, {
                context: context_1.SPContext.peoplepickerContext,
                personSelectionLimit: allowMultiple ? maxSelections : 1,
                // ... other props ...
                onChange: handlePeoplePickerChange,  // <--- CHANGE THIS LINE
```

### Replace the onChange line with:
```javascript
                onChange: function(items) {
                    // Call the original handler for internal state
                    handlePeoplePickerChange(items);
                    // Also call fieldOnChange for React Hook Form
                    var principals = (0, SPUserField_utils_1.peoplePickerItemsToPrincipals)(items);
                    var finalValue = allowMultiple ? principals : (principals.length > 0 ? principals[0] : null);
                    fieldOnChange(finalValue);
                },
```

## Alternative Fix (Simpler)
Just replace the PeoplePicker's onChange to use fieldOnChange directly:

```javascript
                onChange: function(items) {
                    var principals = (0, SPUserField_utils_1.peoplePickerItemsToPrincipals)(items);
                    var finalValue = allowMultiple ? principals : (principals.length > 0 ? principals[0] : null);
                    setInternalValue(finalValue);
                    fieldOnChange(finalValue);
                    if (onChange) {
                        onChange(finalValue);
                    }
                },
```

## Steps to Apply Fix
1. Open `/Users/hemantmane/Development/legal-workflow/node_modules/spfx-toolkit/lib/components/spFields/SPUserField/SPUserField.js`
2. Find the `React.createElement(PeoplePicker_1.PeoplePicker, { ... onChange: handlePeoplePickerChange, ...` line
3. Replace `onChange: handlePeoplePickerChange,` with the code above
4. Save the file
5. Test the approval section

## Testing
1. Go to a request form
2. Toggle Communications Approval to Yes
3. Select a user in the "Approved By" field
4. Save the form
5. Check browser console - you should see the approver value being saved
6. Reload the page and verify the approver is still there
