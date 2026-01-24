/**
 * Generate XML from selected attributes
 * @param {Array} checkboxTree - The full parsed tree
 * @param {Object} selectedAttributes - { typeId: Set of attribute IDs }
 * @param {boolean} isPartial - If true, return array of snippets. If false, return full XML string.
 * @returns {string|Array} - For full: single XML string. For partial: array of {typeId, snippet} objects
 */
export const generateXML = (checkboxTree, selectedAttributes, isPartial = true) => {
    if (isPartial) {
        // Partial export: return array of separate type-extension snippets
        const snippets = [];

        Object.entries(selectedAttributes).forEach(([typeId, attrSet]) => {
            if (attrSet.size === 0) return;

            const type = checkboxTree.find(t => t.typeId === typeId);
            if (!type) return;

            const xmlLines = [];

            // Start type-extension (no XML header, just the type-extension element)
            xmlLines.push(`<type-extension type-id="${typeId}">`);
            xmlLines.push('    <custom-attribute-definitions>');

            // Get selected attributes only
            const attributesToExport = type.attributes.filter(attr => attrSet.has(attr.id));

            // Generate attribute definitions
            attributesToExport.forEach(attr => {
                xmlLines.push(`        <attribute-definition attribute-id="${attr.id}">`);

                if (attr.displayName) {
                    xmlLines.push(`            <display-name xml:lang="x-default">${escapeXml(attr.displayName)}</display-name>`);
                }

                if (attr.type) {
                    xmlLines.push(`            <type>${attr.type}</type>`);
                }

                // Add default flags
                xmlLines.push('            <mandatory-flag>false</mandatory-flag>');
                xmlLines.push('            <externally-managed-flag>false</externally-managed-flag>');

                xmlLines.push('        </attribute-definition>');
            });

            xmlLines.push('    </custom-attribute-definitions>');

            // Add group-definitions if there are groups with selected attributes
            if (type.groups && type.groups.length > 0) {
                const exportedAttributeIds = new Set(attributesToExport.map(attr => attr.id));

                const relevantGroups = type.groups.filter(group =>
                    group.attributeIds && group.attributeIds.some(attrId => exportedAttributeIds.has(attrId))
                );

                if (relevantGroups.length > 0) {
                    xmlLines.push('    <group-definitions>');

                    relevantGroups.forEach(group => {
                        xmlLines.push(`        <attribute-group group-id="${escapeXml(group.groupId)}">`);

                        if (group.displayName) {
                            xmlLines.push(`            <display-name xml:lang="x-default">${escapeXml(group.displayName)}</display-name>`);
                        }

                        // Add ALL attribute references from the group
                        group.attributeIds.forEach(attrId => {
                            xmlLines.push(`            <attribute attribute-id="${escapeXml(attrId)}"/>`);
                        });

                        xmlLines.push('        </attribute-group>');
                    });

                    xmlLines.push('    </group-definitions>');
                }
            }

            xmlLines.push('</type-extension>');

            snippets.push({
                typeId,
                snippet: xmlLines.join('\n'),
                attributeCount: attributesToExport.length,
                groupCount: type.groups ? type.groups.filter(group =>
                    group.attributeIds && group.attributeIds.some(attrId => attrSet.has(attrId))
                ).length : 0
            });
        });

        return snippets;
    }

    // Full export: return complete XML document
    const xmlLines = [];

    // XML header
    xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
    xmlLines.push('<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">');

    // Process each type-extension that has selected attributes
    Object.entries(selectedAttributes).forEach(([typeId, attrSet]) => {
        if (attrSet.size === 0) return;

        // Find the type in the tree
        const type = checkboxTree.find(t => t.typeId === typeId);
        if (!type) return;

        // Start type-extension
        xmlLines.push(`    <type-extension type-id="${typeId}">`);
        xmlLines.push('        <custom-attribute-definitions>');

        // Get only selected attributes for full export
        const attributesToExport = type.attributes.filter(attr => attrSet.has(attr.id));

        // Generate attribute definitions
        attributesToExport.forEach(attr => {
            xmlLines.push(`            <attribute-definition attribute-id="${attr.id}">`);

            if (attr.displayName) {
                xmlLines.push(`                <display-name xml:lang="x-default">${escapeXml(attr.displayName)}</display-name>`);
            }

            if (attr.type) {
                xmlLines.push(`                <type>${attr.type}</type>`);
            }

            // Add default flags
            xmlLines.push('                <mandatory-flag>false</mandatory-flag>');
            xmlLines.push('                <externally-managed-flag>false</externally-managed-flag>');

            xmlLines.push('            </attribute-definition>');
        });

        xmlLines.push('        </custom-attribute-definitions>');

        // Add group-definitions if there are groups with selected attributes
        if (type.groups && type.groups.length > 0) {
            const exportedAttributeIds = new Set(attributesToExport.map(attr => attr.id));

            // Find groups that contain any of the exported attributes
            const relevantGroups = type.groups.filter(group =>
                group.attributeIds && group.attributeIds.some(attrId => exportedAttributeIds.has(attrId))
            );

            // Only add group-definitions section if there are relevant groups
            if (relevantGroups.length > 0) {
                xmlLines.push('        <group-definitions>');

                relevantGroups.forEach(group => {
                    xmlLines.push(`            <attribute-group group-id="${escapeXml(group.groupId)}">`);

                    if (group.displayName) {
                        xmlLines.push(`                <display-name xml:lang="x-default">${escapeXml(group.displayName)}</display-name>`);
                    }

                    // Add ALL attribute references from the group (not just selected ones)
                    group.attributeIds.forEach(attrId => {
                        xmlLines.push(`                <attribute attribute-id="${escapeXml(attrId)}"/>`);
                    });

                    xmlLines.push('            </attribute-group>');
                });

                xmlLines.push('        </group-definitions>');
            }
        }

        xmlLines.push('    </type-extension>');
        xmlLines.push('');
    });

    // Close metadata
    xmlLines.push('</metadata>');

    return xmlLines.join('\n');
};

/**
 * Escape XML special characters
 */
const escapeXml = (text) => {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

/**
 * Generate a summary of what's being exported
 */
export const generateExportSummary = (selectedAttributes, checkboxTree) => {
    const summary = [];
    let totalAttributes = 0;

    Object.entries(selectedAttributes).forEach(([typeId, attrSet]) => {
        if (attrSet.size > 0) {
            summary.push(`${typeId}: ${attrSet.size} attribute${attrSet.size > 1 ? 's' : ''}`);
            totalAttributes += attrSet.size;
        }
    });

    return {
        summary: summary.join('\n'),
        totalTypes: summary.length,
        totalAttributes
    };
};
