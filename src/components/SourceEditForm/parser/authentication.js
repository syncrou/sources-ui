import React from 'react';
import get from 'lodash/get';
import componentTypes from '@data-driven-forms/react-form-renderer/dist/cjs/component-types';
import validatorTypes from '@data-driven-forms/react-form-renderer/dist/cjs/validator-types';
import hardcodedSchemas from '@redhat-cloud-services/frontend-components-sources/cjs/hardcodedSchemas';
import { FormattedMessage } from 'react-intl';

import { unsupportedAuthTypeField } from './unsupportedAuthType';
import AuthenticationManagement from './AuthenticationManagement';
import RemoveAuthPlaceholder from './RemoveAuthPlaceholder';
import { modifyFields } from './helpers';

export const createAuthFieldName = (fieldName, id) => `authentications.a${id}.${fieldName.replace('authentication.', '')}`;

export const getLastPartOfName = (fieldName) => fieldName.split('.').pop();

export const removeRequiredValidator = (validate = []) =>
    validate.filter(validation => validation.type !== validatorTypes.REQUIRED && validation.type !== 'required-validator');

export const getEnhancedAuthField = (sourceType, authtype, name) =>
    get(hardcodedSchemas, [sourceType, 'authentication', authtype, 'generic', name], {});

export const getAdditionalAuthSteps = (sourceType, authtype) =>
    get(hardcodedSchemas, [sourceType, 'authentication', authtype, 'generic', 'includeStepKeyFields'], []);

export const modifyAuthSchemas = (fields, id) => fields.map((field) => {
    const editedName = field.name.startsWith('authentication') ? createAuthFieldName(field.name, id) : field.name;

    const finalField = ({
        ...field,
        name: editedName,
    });

    const isPassword = getLastPartOfName(finalField.name) === 'password';

    if (isPassword) {
        finalField.helperText = (<FormattedMessage
            id="sources.passwordResetHelperText"
            defaultMessage={`Changing this resets your current { label }.`}
            values={{
                label: finalField.label
            }}
        />);
        finalField.isRequired = false;
        finalField.validate = removeRequiredValidator(finalField.validate);
    }

    return finalField;
});

export const authenticationFields = (authentications, sourceType, appTypes) => {
    if (!authentications || authentications.length === 0 || !sourceType.schema || !sourceType.schema.authentication) {
        return [];
    }

    return authentications.map(({ isDeleting, ...auth }) => {
        const schemaAuth = sourceType.schema.authentication.find(({ type }) => type === auth.authtype);

        if (!schemaAuth) {
            return unsupportedAuthTypeField(auth.authtype);
        }

        const additionalStepKeys = getAdditionalAuthSteps(sourceType.name, auth.authtype);

        const enhancedFields = schemaAuth.fields
        .filter(field => !field.stepKey || additionalStepKeys.includes(field.stepKey))
        .map((field) => ({
            ...field,
            ...getEnhancedAuthField(sourceType.name, auth.authtype, field.name)
        }));

        return ({
            component: componentTypes.SUB_FORM,
            name: schemaAuth.name,
            fields: [
                {
                    component: 'description',
                    name: `${auth.id}-authentication-management`,
                    Content: AuthenticationManagement,
                    schemaAuth,
                    appTypes,
                    auth,
                    isDeleting
                },
                isDeleting ?  {
                    component: 'description',
                    name: `${auth.id}-remove-spinner`,
                    Content: RemoveAuthPlaceholder
                } : modifyFields(modifyAuthSchemas(enhancedFields, auth.id))
            ]
        });
    });
};
