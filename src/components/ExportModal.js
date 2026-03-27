import React, { useState } from 'react';
import {
  Box,
  Button,
  Text,
  Code,
  VStack,
  HStack,
  Heading,
} from '@chakra-ui/react';
import { Dialog } from '@chakra-ui/react';
import { MdContentCopy, MdCheck, MdDownload } from 'react-icons/md';
import { generateExportSummary } from '../utils/xmlGenerator';

const ExportModal = ({ isOpen, onClose, snippet, exportType = 'partial', selectedAttributes, checkboxTree }) => {
    const [copiedIndex, setCopiedIndex] = useState(null);

    const handleCopy = async (text, index = null) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleDownload = (text, filename) => {
        try {
            const blob = new Blob([text], { type: 'application/xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download:', err);
        }
    };

    const summary = selectedAttributes && checkboxTree
        ? generateExportSummary(selectedAttributes, checkboxTree)
        : null;

    const exportTypeLabel = exportType === 'full' ? 'Full XML' : 'Partial XML';
    const exportDescription = exportType === 'full'
        ? 'Complete XML document with selected attributes (includes XML header and metadata wrapper)'
        : 'Individual type-extension snippets with selected attributes (no XML header)';

    // Check if snippet is an array (partial) or string (full)
    const isPartialExport = Array.isArray(snippet);
    const snippets = isPartialExport ? snippet : [{ typeId: 'Complete XML', snippet, attributeCount: 0, groupCount: 0 }];

    return (
        <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="xl">
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content maxH="90vh" overflow="hidden" display="flex" flexDirection="column">
                    <Dialog.Header>
                        <Dialog.Title>Export {exportTypeLabel}</Dialog.Title>
                        <Dialog.CloseTrigger />
                    </Dialog.Header>
                    <Dialog.Body overflow="auto">
                        <VStack align="stretch" spacing={3}>
                            <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                                <Text fontSize="sm" fontWeight="bold" color="blue.700" mb={1}>
                                    {exportDescription}
                                </Text>
                                {summary && (
                                    <Text fontSize="xs" color="gray.600">
                                        {summary.totalTypes} type-extension{summary.totalTypes !== 1 ? 's' : ''} • {summary.totalAttributes} attribute{summary.totalAttributes !== 1 ? 's' : ''}
                                    </Text>
                                )}
                            </Box>

                            {!isPartialExport && (
                                <Text fontSize="sm" color="gray.600">
                                    Copy the complete XML document:
                                </Text>
                            )}

                            {isPartialExport && (
                                <Text fontSize="sm" color="gray.600">
                                    Copy individual type-extension snippets:
                                </Text>
                            )}

                            {snippets.map((item, index) => (
                                <Box key={index}>
                                    {isPartialExport && (
                                        <HStack justify="space-between" mb={2}>
                                            <Heading size="sm" color="blue.600">
                                                {item.typeId}
                                            </Heading>
                                            <HStack spacing={2}>
                                                <Text fontSize="xs" color="gray.600">
                                                    {item.attributeCount} attr • {item.groupCount} group{item.groupCount !== 1 ? 's' : ''}
                                                </Text>
                                            </HStack>
                                        </HStack>
                                    )}
                                    <Box
                                        as="pre"
                                        p={3}
                                        bg="gray.50"
                                        borderRadius="md"
                                        border="1px solid"
                                        borderColor="gray.200"
                                        overflow="auto"
                                        maxH="300px"
                                        fontSize="sm"
                                        mb={2}
                                    >
                                        <Code>{item.snippet}</Code>
                                    </Box>
                                    <HStack gap={2}>
                                        <Button
                                            flex={1}
                                            colorPalette={copiedIndex === index ? 'green' : 'blue'}
                                            onClick={() => handleCopy(item.snippet, index)}
                                            size="sm"
                                        >
                                            {copiedIndex === index ? (
                                                <>
                                                    <MdCheck /> Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <MdContentCopy /> Copy {isPartialExport ? item.typeId : 'to Clipboard'}
                                                </>
                                            )}
                                        </Button>
                                        
                                        {!isPartialExport && (
                                            <Button
                                                flex={1}
                                                colorPalette="green"
                                                variant="outline"
                                                onClick={() => {
                                                    const timestamp = new Date().toISOString().split('T')[0];
                                                    const filename = `metadata-export-${timestamp}.xml`;
                                                    handleDownload(item.snippet, filename);
                                                }}
                                                size="sm"
                                            >
                                                <MdDownload /> Download XML
                                            </Button>
                                        )}
                                        
                                        {isPartialExport && (
                                            <Button
                                                flex={1}
                                                colorPalette="green"
                                                variant="outline"
                                                onClick={() => {
                                                    const sanitizedTypeId = item.typeId.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                                                    const filename = `${sanitizedTypeId}-snippet.xml`;
                                                    handleDownload(item.snippet, filename);
                                                }}
                                                size="sm"
                                            >
                                                <MdDownload /> Download
                                            </Button>
                                        )}
                                    </HStack>
                                </Box>
                            ))}
                        </VStack>
                    </Dialog.Body>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};

export default ExportModal;
