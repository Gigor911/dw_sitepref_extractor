import React, { memo, useCallback } from 'react';
import {
  Box,
  Checkbox,
  Badge,
  Text,
} from '@chakra-ui/react';

const AttributeItem = memo(({ attr, typeId, isSelected, onToggle }) => {
    const handleCheckedChange = useCallback((details) => {
        if (onToggle && typeId) {
            onToggle(typeId, attr.id, details.checked);
        }
    }, [onToggle, typeId, attr.id]);

    return (
        <Checkbox.Root
            value={attr.id}
            colorPalette="blue"
            alignItems="flex-start"
            checked={isSelected}
            onCheckedChange={handleCheckedChange}
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
});

AttributeItem.displayName = 'AttributeItem';

export default AttributeItem;
