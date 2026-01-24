import React from 'react';
import {
  Box,
  Checkbox,
  Badge,
  Text,
} from '@chakra-ui/react';

const AttributeItem = ({ attr, typeId, isSelected, onToggle }) => {
    const handleChange = (e) => {
        if (onToggle && typeId) {
            onToggle(typeId, attr.id, e.target.checked);
        }
    };

    return (
        <Checkbox.Root
            value={attr.id}
            colorPalette="blue"
            alignItems="flex-start"
            checked={isSelected}
            onCheckedChange={(details) => {
                if (onToggle && typeId) {
                    onToggle(typeId, attr.id, details.checked);
                }
            }}
        >
            <Checkbox.HiddenInput />
            <Checkbox.Control>
                <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>
                <Box>
                    <Text fontWeight="bold" fontSize="sm">{attr.id}</Text>
                    <Text fontSize="xs" color="gray.600">
                        {attr.displayName && <Text as="span" mr={1}>{attr.displayName}</Text>}
                        {attr.type && <Badge size="xs" colorPalette="gray">{attr.type}</Badge>}
                    </Text>
                </Box>
            </Checkbox.Label>
        </Checkbox.Root>
    );
};

export default AttributeItem;
