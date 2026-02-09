import React, { useMemo, memo } from 'react';
import { Box, useBreakpointValue } from '@chakra-ui/react';
import { List } from 'react-window';
import AttributeItem from './AttributeItem';

// Row component for react-window v2
const VirtualizedRow = memo(({ index, style, attributes, columnCount, typeId, selectedAttributes, onAttributeToggle }) => {
    const startIndex = index * columnCount;
    const rowItems = [];

    for (let col = 0; col < columnCount; col++) {
        const itemIndex = startIndex + col;
        if (itemIndex < attributes.length) {
            const attr = attributes[itemIndex];
            rowItems.push(
                <Box key={attr.id || itemIndex} flex="1" p={2}>
                    <AttributeItem
                        attr={attr}
                        typeId={typeId}
                        isSelected={selectedAttributes?.has(attr.id)}
                        onToggle={onAttributeToggle}
                    />
                </Box>
            );
        } else {
            // Empty placeholder for grid alignment
            rowItems.push(<Box key={`empty-${col}`} flex="1" p={2} />);
        }
    }

    return (
        <div style={style}>
            <Box display="flex" gap={2}>
                {rowItems}
            </Box>
        </div>
    );
});

VirtualizedRow.displayName = 'VirtualizedRow';

// Threshold for when to use virtualization
const VIRTUALIZATION_THRESHOLD = 50;

const AttributeList = ({ typeId, attributes, onAttributeToggle, selectedAttributes }) => {
    // Responsive column count
    const columnCount = useBreakpointValue({ base: 1, md: 2, lg: 3 }) || 1;

    const rowCount = useMemo(() =>
        Math.ceil(attributes.length / columnCount),
        [attributes.length, columnCount]
    );

    const rowProps = useMemo(() => ({
        attributes,
        columnCount,
        typeId,
        selectedAttributes,
        onAttributeToggle
    }), [attributes, columnCount, typeId, selectedAttributes, onAttributeToggle]);

    // For small lists, render without virtualization to avoid overhead
    if (attributes.length <= VIRTUALIZATION_THRESHOLD) {
        return (
            <Box maxH={'500px'} overflow={'auto'}>
                <Box
                    display="grid"
                    gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
                    gap={4}
                >
                    {attributes.map((attr, index) => (
                        <AttributeItem
                            key={attr.id || index}
                            attr={attr}
                            typeId={typeId}
                            isSelected={selectedAttributes?.has(attr.id)}
                            onToggle={onAttributeToggle}
                        />
                    ))}
                </Box>
            </Box>
        );
    }

    // For large lists, use virtualization with react-window v2 API
    return (
        <Box h="500px">
            <List
                rowComponent={VirtualizedRow}
                rowCount={rowCount}
                rowHeight={80}
                rowProps={rowProps}
                style={{ width: '100%', height: '100%' }}
            />
        </Box>
    );
};

export default memo(AttributeList);
