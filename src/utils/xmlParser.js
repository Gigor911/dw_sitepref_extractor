/**
 * Parses xml2js output into the app's internal checkboxTree data model.
 * Handles multiple SFCC XML root structures and both attribute-definition tag variants.
 *
 * @param {Object} xmlData - Parsed output from xml2js.parseString
 * @returns {Array} checkboxTree - Array of { typeId, attributes, groups }
 */
export const buildCheckboxTree = (xmlData) => {
    const tree = [];
    let typeExtensions = [];

    if (xmlData['type-extensions']?.['type-extension']) {
        typeExtensions = xmlData['type-extensions']['type-extension'];
    } else if (xmlData['metadata']?.['type-extension']) {
        typeExtensions = xmlData['metadata']['type-extension'];
    } else if (xmlData['type-extension']) {
        typeExtensions = xmlData['type-extension'];
    }

    if (!typeExtensions.length) {
        console.warn('No type-extensions found in XML');
    }

    typeExtensions.forEach((typeExtension) => {
        const typeId = typeExtension['$']?.['type-id'];

        const definitionsWrapper = typeExtension['custom-attribute-definitions']?.[0];
        const customAttributes =
            definitionsWrapper?.['attribute-definition'] ||
            definitionsWrapper?.['custom-attribute-definition'] ||
            [];

        const attributes = customAttributes.map((attr) => {
            const id = attr['$']?.['attribute-id'];

            let displayName = '';
            if (attr['display-name']) {
                const dn = attr['display-name'][0];
                displayName = typeof dn === 'object' ? dn._ : dn;
            }

            let type = '';
            if (attr['type']) {
                const t = attr['type'][0];
                type = typeof t === 'object' ? t._ : t;
            } else if (attr['$']?.['type']) {
                type = attr['$']['type'];
            }

            return { id, displayName, type };
        });

        const groupDefinitionsWrapper = typeExtension['group-definitions']?.[0];
        const attributeGroups = groupDefinitionsWrapper?.['attribute-group'] || [];

        const groups = attributeGroups.map((group) => {
            const groupId = group['$']?.['group-id'];

            let displayName = '';
            if (group['display-name']) {
                const dn = group['display-name'][0];
                displayName = typeof dn === 'object' ? dn._ : dn;
            }

            const groupAttributes = group['attribute'] || [];
            const attributeIds = groupAttributes
                .map((attr) => attr['$']?.['attribute-id'])
                .filter(Boolean);

            return { groupId, displayName, attributeIds };
        });

        if (attributes.length > 0) {
            tree.push({ typeId, attributes, groups });
        }
    });

    return tree;
};

