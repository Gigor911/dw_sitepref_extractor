import React, { useState, useEffect } from 'react';
import {
  Box,
  Input,
  HStack,
  Text,
} from '@chakra-ui/react';

const FilterBar = ({ typeFilter, attributeFilter, onTypeFilterChange, onAttributeFilterChange }) => {
    const [localTypeFilter, setLocalTypeFilter] = useState(typeFilter);
    const [localAttributeFilter, setLocalAttributeFilter] = useState(attributeFilter);

    // Debounce the filter changes
    useEffect(() => {
        const timer = setTimeout(() => {
            onTypeFilterChange(localTypeFilter);
        }, 300);
        return () => clearTimeout(timer);
    }, [localTypeFilter, onTypeFilterChange]);

    useEffect(() => {
        const timer = setTimeout(() => {
            onAttributeFilterChange(localAttributeFilter);
        }, 300);
        return () => clearTimeout(timer);
    }, [localAttributeFilter, onAttributeFilterChange]);

    return (
        <Box
            position="sticky"
            top={0}
            zIndex={10}
            bg="white"
            p={3}
            mb={3}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
        >
            <HStack spacing={3}>
                <Box flex={1}>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                        Filter by Type ID
                    </Text>
                    <Input
                        placeholder="e.g., SitePreferences, Product..."
                        value={localTypeFilter}
                        onChange={(e) => setLocalTypeFilter(e.target.value)}
                        size="sm"
                    />
                </Box>
                <Box flex={1}>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                        Filter by Attribute ID
                    </Text>
                    <Input
                        placeholder="e.g., isEnabled, price..."
                        value={localAttributeFilter}
                        onChange={(e) => setLocalAttributeFilter(e.target.value)}
                        size="sm"
                    />
                </Box>
            </HStack>
        </Box>
    );
};

export default FilterBar;
