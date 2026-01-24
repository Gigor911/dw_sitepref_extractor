import React from 'react';
import { Box, SimpleGrid } from '@chakra-ui/react';
import AttributeItem from './AttributeItem';

const AttributeList = ({ typeId, attributes, onAttributeToggle, selectedAttributes }) => {
    return (
        <Box maxH={'500px'} overflow={'auto'}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {attributes.map((attr, index) => (
                    <AttributeItem
                        key={index}
                        attr={attr}
                        typeId={typeId}
                        isSelected={selectedAttributes?.has(attr.id)}
                        onToggle={onAttributeToggle}
                    />
                ))}
            </SimpleGrid>
        </Box>
    );
};

export default AttributeList;
