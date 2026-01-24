import React from 'react';
import {
  Box,
  Text,
  Badge,
  VStack,
  HStack,
} from '@chakra-ui/react';

const SelectedGroups = ({ selectedAttributes, checkboxTree }) => {
    if (!checkboxTree) return null;

    // Build a map of typeId to type data
    const typeMap = {};
    checkboxTree.forEach(type => {
        typeMap[type.typeId] = type;
    });

    // Group by type-id, find groups that contain at least one selected attribute
    const groupsByType = {};

    Object.entries(selectedAttributes).forEach(([typeId, attrSet]) => {
        if (attrSet.size === 0) return;

        const type = typeMap[typeId];
        if (!type || !type.groups) return;

        // Find groups in this type that have selected attributes
        const relevantGroups = type.groups.filter(group => {
            return group.attributeIds && group.attributeIds.some(attrId => attrSet.has(attrId));
        });

        if (relevantGroups.length > 0) {
            groupsByType[typeId] = relevantGroups;
        }
    });

    // Count total groups across all types
    const totalGroups = Object.values(groupsByType).reduce((sum, groups) => sum + groups.length, 0);

    // If no groups, show message
    if (totalGroups === 0) {
        return (
            <Box p={3} bg="gray.50" borderRadius="md" textAlign="center">
                <Text fontSize="sm" color="gray.500">No groups selected yet</Text>
            </Box>
        );
    }

    return (
        <VStack align="stretch" spacing={2}>
            {Object.entries(groupsByType).map(([typeId, groups]) => (
                <Box
                    key={typeId}
                    p={2}
                    bg="white"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                >
                    <HStack justify="space-between" mb={2}>
                        <Text fontSize="xs" fontWeight="bold" color="purple.700" isTruncated flex={1}>
                            {typeId}
                        </Text>
                        <Badge size="xs" colorPalette="purple">
                            {groups.length}
                        </Badge>
                    </HStack>

                    <VStack align="stretch" spacing={1}>
                        {groups.map((group, index) => (
                            <HStack
                                key={`${group.groupId}-${index}`}
                                px={2}
                                py={1}
                                bg="purple.50"
                                borderRadius="sm"
                                justify="space-between"
                            >
                                <Text
                                    fontSize="xs"
                                    color="gray.800"
                                    isTruncated
                                    flex={1}
                                >
                                    {group.groupId}
                                </Text>
                                <Badge size="xs" colorPalette="gray" variant="subtle" flexShrink={0}>
                                    {group.attributeIds.length} attr
                                </Badge>
                            </HStack>
                        ))}
                    </VStack>
                </Box>
            ))}
        </VStack>
    );
};

export default SelectedGroups;
