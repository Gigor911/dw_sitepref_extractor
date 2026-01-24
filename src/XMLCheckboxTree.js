import React, { useState, useEffect, useMemo } from 'react';
import { parseString } from 'xml2js';
import {
  Box,
  Heading,
  Input,
  Accordion,
  Badge,
  Text,
  Card,
  Spinner,
  Center,
  Grid,
  GridItem,
  VStack,
  HStack,
  Button,
} from '@chakra-ui/react';
import AttributeList from './components/AttributeList';
import FileHistory from './components/FileHistory';
import SelectedAttributes from './components/SelectedAttributes';
import SelectedGroups from './components/SelectedGroups';
import FilterBar from './components/FilterBar';
import ExportModal from './components/ExportModal';
import {
    saveParsedData,
    getParsedData,
    clearParsedData,
    saveFileToHistory,
    updateFileState,
    getFileFromHistory,
    getCurrentFileId,
    getAllFileHistory,
    deleteFileFromHistory,
    saveAppState,
    getAppState
} from './utils/db';
import { generateXML, generateExportSummary } from './utils/xmlGenerator';

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const XMLCheckboxTree = () => {
  const [checkboxTree, setCheckboxTree] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [fileHistory, setFileHistory] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState({}); // { typeId: Set of attribute IDs }
  const [typeFilter, setTypeFilter] = useState('');
  const [attributeFilter, setAttributeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('partial'); // 'full' or 'partial'

  const loadFileHistory = async () => {
      try {
          const history = await getAllFileHistory();
          setFileHistory(history);
      } catch (error) {
          console.error('Failed to load file history:', error);
      }
  };

  useEffect(() => {
    const loadData = async () => {
        try {
            // Load current file ID
            const fileId = await getCurrentFileId();

            if (fileId) {
                // Load specific file from history
                const fileData = await getFileFromHistory(fileId);
                if (fileData) {
                    setCheckboxTree(fileData.tree);
                    setFileInfo(fileData.fileInfo);
                    setCurrentFileId(fileId);

                    // Restore file-specific state (filters and selections)
                    if (fileData.fileState) {
                        if (fileData.fileState.typeFilter !== undefined) {
                            setTypeFilter(fileData.fileState.typeFilter);
                        }
                        if (fileData.fileState.attributeFilter !== undefined) {
                            setAttributeFilter(fileData.fileState.attributeFilter);
                        }
                        if (fileData.fileState.selectedAttributes) {
                            // Convert plain object with arrays back to Sets
                            const restoredSelected = {};
                            Object.entries(fileData.fileState.selectedAttributes).forEach(([typeId, attrArray]) => {
                                restoredSelected[typeId] = new Set(attrArray);
                            });
                            setSelectedAttributes(restoredSelected);
                        }
                    } else {
                        // No saved state for this file, reset to defaults
                        setTypeFilter('');
                        setAttributeFilter('');
                        setSelectedAttributes({});
                    }
                }
            } else {
                // Backward compatibility: try loading old format
                const data = await getParsedData();
                if (data) {
                    if (Array.isArray(data)) {
                        setCheckboxTree(data);
                    } else if (data.tree) {
                        setCheckboxTree(data.tree);
                        setFileInfo(data.fileInfo);
                    }
                }

                // For old format, try loading global app state
                const appState = await getAppState();
                if (appState) {
                    if (appState.typeFilter) setTypeFilter(appState.typeFilter);
                    if (appState.attributeFilter) setAttributeFilter(appState.attributeFilter);
                    if (appState.selectedAttributes) {
                        const restoredSelected = {};
                        Object.entries(appState.selectedAttributes).forEach(([typeId, attrArray]) => {
                            restoredSelected[typeId] = new Set(attrArray);
                        });
                        setSelectedAttributes(restoredSelected);
                    }
                }
            }

            // Load file history
            await loadFileHistory();
        } catch (error) {
            console.error('Failed to load data from DB:', error);
        }
    };
    loadData();
  }, []);

  // Save file-specific state whenever filters or selected attributes change
  useEffect(() => {
    const saveState = async () => {
      if (!currentFileId) return; // Don't save if no file is loaded

      try {
        // Convert Sets to Arrays for storage
        const selectedAttributesForStorage = {};
        Object.entries(selectedAttributes).forEach(([typeId, attrSet]) => {
          selectedAttributesForStorage[typeId] = Array.from(attrSet);
        });

        const fileState = {
          typeFilter,
          attributeFilter,
          selectedAttributes: selectedAttributesForStorage
        };

        // Update the file-specific state in history
        await updateFileState(currentFileId, fileState);

        // Also save to global app state for backward compatibility
        await saveAppState(fileState);
      } catch (error) {
        console.error('Failed to save file state:', error);
      }
    };

    saveState();
  }, [typeFilter, attributeFilter, selectedAttributes, currentFileId]);

  const handleFileUpload = (details) => {
    const file = details.acceptedFiles?.[0];
    if (file) {
      setIsLoading(true);
      setCheckboxTree(null);
      setFileInfo(null);
      setSelectedAttributes({}); // Clear selections on new file
      setTypeFilter(''); // Clear filters on new file
      setAttributeFilter('');

      const fileId = `${file.name}-${file.size}-${file.lastModified}`;
      const currentFileInfo = {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          uploadedAt: Date.now()
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        const xmlContent = e.target.result;
        setTimeout(() => {
            parseString(xmlContent, async (err, result) => {
            if (err) {
                console.error('Error parsing XML:', err);
                setIsLoading(false);
                return;
            }
            console.log('Parsed XML Result:', result);
            const tree = buildCheckboxTree(result);

            // Initialize file data with empty state
            const fileData = {
                tree,
                fileInfo: currentFileInfo,
                fileState: {
                    typeFilter: '',
                    attributeFilter: '',
                    selectedAttributes: {}
                }
            };

            setCheckboxTree(tree);
            setFileInfo(currentFileInfo);
            setCurrentFileId(fileId);

            // Save to history and update current file reference
            await saveFileToHistory(fileId, fileData);
            await saveParsedData(fileData); // Backward compatibility

            // Reload history
            await loadFileHistory();

            setIsLoading(false);
            });
        }, 100);
      };
      reader.onerror = () => setIsLoading(false);
      reader.readAsText(file);
    }
  };

  const handleSelectFile = async (fileId) => {
      try {
          setIsLoading(true);
          const fileData = await getFileFromHistory(fileId);
          if (fileData) {
              setCheckboxTree(fileData.tree);
              setFileInfo(fileData.fileInfo);
              setCurrentFileId(fileId);

              // Restore file-specific state (filters and selections)
              if (fileData.fileState) {
                  setTypeFilter(fileData.fileState.typeFilter || '');
                  setAttributeFilter(fileData.fileState.attributeFilter || '');

                  if (fileData.fileState.selectedAttributes) {
                      // Convert plain object with arrays back to Sets
                      const restoredSelected = {};
                      Object.entries(fileData.fileState.selectedAttributes).forEach(([typeId, attrArray]) => {
                          restoredSelected[typeId] = new Set(attrArray);
                      });
                      setSelectedAttributes(restoredSelected);
                  } else {
                      setSelectedAttributes({});
                  }
              } else {
                  // No saved state for this file, reset to defaults
                  setTypeFilter('');
                  setAttributeFilter('');
                  setSelectedAttributes({});
              }

              // Update current file reference
              await saveFileToHistory(fileId, fileData);
              await saveParsedData(fileData); // Backward compatibility
          }
          setIsLoading(false);
      } catch (error) {
          console.error('Failed to load file:', error);
          setIsLoading(false);
      }
  };

  const handleDeleteFile = async (fileId) => {
      try {
          await deleteFileFromHistory(fileId);

          // If deleting current file, clear the view
          if (fileId === currentFileId) {
              setCheckboxTree(null);
              setFileInfo(null);
              setCurrentFileId(null);
              await clearParsedData();
          }

          // Reload history
          await loadFileHistory();
      } catch (error) {
          console.error('Failed to delete file:', error);
      }
  };

  const handleAttributeToggle = (typeId, attributeId, isChecked) => {
      setSelectedAttributes(prev => {
          const newSelected = { ...prev };
          if (!newSelected[typeId]) {
              newSelected[typeId] = new Set();
          }

          if (isChecked) {
              newSelected[typeId].add(attributeId);
          } else {
              newSelected[typeId].delete(attributeId);
          }

          return newSelected;
      });
  };

  const getSelectedCount = (typeId) => {
      return selectedAttributes[typeId]?.size || 0;
  };

  const handleDeleteType = (typeId) => {
      setSelectedAttributes(prev => {
          const newSelected = { ...prev };
          delete newSelected[typeId];
          return newSelected;
      });
  };

  const handleDeleteAttribute = (typeId, attributeId) => {
      setSelectedAttributes(prev => {
          const newSelected = { ...prev };
          if (newSelected[typeId]) {
              newSelected[typeId].delete(attributeId);
              // Remove the type group if no attributes left
              if (newSelected[typeId].size === 0) {
                  delete newSelected[typeId];
              }
          }
          return newSelected;
      });
  };

  const handleExportFull = () => {
      setExportType('full');
      setIsExportModalOpen(true);
  };

  const handleExportPartial = () => {
      setExportType('partial');
      setIsExportModalOpen(true);
  };

  const getExportXML = () => {
      if (!checkboxTree || !selectedAttributes) return '';
      return generateXML(checkboxTree, selectedAttributes, exportType === 'partial');
  };

  const getSelectedGroupsCount = () => {
      if (!checkboxTree) return 0;

      let count = 0;
      Object.entries(selectedAttributes).forEach(([typeId, attrSet]) => {
          if (attrSet.size === 0) return;

          const type = checkboxTree.find(t => t.typeId === typeId);
          if (!type || !type.groups) return;

          // Count groups that have at least one selected attribute
          type.groups.forEach(group => {
              const hasSelectedAttr = group.attributeIds && group.attributeIds.some(attrId => attrSet.has(attrId));
              if (hasSelectedAttr) count++;
          });
      });

      return count;
  };

  // Filter logic - memoized to prevent unnecessary recalculations
  const filteredTree = useMemo(() => {
      if (!checkboxTree) return null;

      return checkboxTree.filter(type => {
          // Filter by type ID
          if (typeFilter && !type.typeId.toLowerCase().includes(typeFilter.toLowerCase())) {
              return false;
          }

          // If attribute filter is set, check if any attributes match
          if (attributeFilter) {
              const hasMatchingAttribute = type.attributes.some(attr =>
                  attr.id.toLowerCase().includes(attributeFilter.toLowerCase())
              );
              return hasMatchingAttribute;
          }

          return true;
      }).map(type => {
          // If attribute filter is set, filter the attributes within each type
          if (attributeFilter) {
              return {
                  ...type,
                  attributes: type.attributes.filter(attr =>
                      attr.id.toLowerCase().includes(attributeFilter.toLowerCase())
                  )
              };
          }
          return type;
      });
  }, [checkboxTree, typeFilter, attributeFilter]);

  const buildCheckboxTree = (xmlData) => {
    const tree = [];
    let typeExtensions = [];

    // Handle different XML structures (e.g., wrapped in metadata or directly in type-extensions)
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
      // Check for both 'attribute-definition' (per user request) and 'custom-attribute-definition' (legacy/alternative)
      const customAttributes = definitionsWrapper?.['attribute-definition'] || definitionsWrapper?.['custom-attribute-definition'] || [];

      const attributes = customAttributes.map((attr) => {
        const id = attr['$']?.['attribute-id'];

        // Extract display-name
        let displayName = '';
        if (attr['display-name']) {
            const dn = attr['display-name'][0];
            displayName = typeof dn === 'object' ? dn._ : dn; // Handle xml2js structure with attributes vs plain text
        }

        // Extract type (inside tag as requested)
        let type = '';
        if (attr['type']) {
             const t = attr['type'][0];
             type = typeof t === 'object' ? t._ : t;
        } else if (attr['$']?.['type']) {
            // Fallback to attribute if not found as child node
            type = attr['$']['type'];
        }

        return { id, displayName, type };
      });

      // Parse group-definitions
      const groupDefinitionsWrapper = typeExtension['group-definitions']?.[0];
      const attributeGroups = groupDefinitionsWrapper?.['attribute-group'] || [];

      const groups = attributeGroups.map((group) => {
        const groupId = group['$']?.['group-id'];

        // Extract display-name
        let displayName = '';
        if (group['display-name']) {
            const dn = group['display-name'][0];
            displayName = typeof dn === 'object' ? dn._ : dn;
        }

        // Extract attribute references
        const groupAttributes = group['attribute'] || [];
        const attributeIds = groupAttributes.map(attr => attr['$']?.['attribute-id']).filter(Boolean);

        return { groupId, displayName, attributeIds };
      });

      if (attributes.length > 0) {
        tree.push({ typeId, attributes, groups });
      }
    });

    return tree;
  };

  return (
    <Box p={4}>
      <Grid templateColumns={{ base: '1fr', lg: '1fr 300px' }} gap={4}>
        <GridItem>
          <Card.Root mb={4} variant="outline" boxShadow="sm">
            <Card.Body>
                <Heading as="h1" size="lg" mb={3}>
                    XML Attribute Extractor
                </Heading>
                <Box>
                    <Text mb={2} fontSize="sm" color="gray.500">Upload your Site Preferences XML file to see available attributes.</Text>
                    <Input
                        type="file"
                        accept=".xml"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                handleFileUpload({ acceptedFiles: [file] });
                            }
                        }}
                        p={2}
                        border="1px solid"
                        borderColor="gray.300"
                        borderRadius="md"
                        _hover={{ borderColor: "blue.400" }}
                        _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                    />
                </Box>
            </Card.Body>
          </Card.Root>

          {isLoading && (
            <Center p={8}>
                <Spinner size="xl" color="blue.500" />
                <Text ml={3} fontWeight="medium">Parsing XML file...</Text>
            </Center>
          )}

          {!isLoading && checkboxTree && (
            <Box>
              {checkboxTree.length === 0 && (
                 <Box p={4} bg="orange.100" color="orange.800" borderRadius="md">
                    No type definitions found in the XML file. Please check the console for details.
                 </Box>
              )}

              {checkboxTree.length > 0 && (
                <>
                  <FilterBar
                    typeFilter={typeFilter}
                    attributeFilter={attributeFilter}
                    onTypeFilterChange={setTypeFilter}
                    onAttributeFilterChange={setAttributeFilter}
                  />

                  <Accordion.Root collapsible lazyMount unmountOnExit>
                    {filteredTree.map((type) => (
                      <Accordion.Item key={type.typeId} value={type.typeId} border="1px solid" borderColor="gray.200" borderRadius="md" mb={2} bg="white">
                        <h2>
                          <Accordion.ItemTrigger _expanded={{ bg: 'blue.50', color: 'blue.600' }} py={2} px={3}>
                            <Box flex="1" textAlign="left" fontWeight="bold">
                              {type.typeId}
                            </Box>
                            {getSelectedCount(type.typeId) > 0 && (
                                <Badge colorScheme="green" mr={2} variant="solid">
                                    {getSelectedCount(type.typeId)} selected
                                </Badge>
                            )}
                            <Badge colorScheme="blue" mr={2} variant="subtle">
                                {type.attributes.length} total
                            </Badge>
                            <Accordion.ItemIndicator />
                          </Accordion.ItemTrigger>
                        </h2>
                        <Accordion.ItemContent p={3}>
                            {type.attributes.length > 0 ? (
                                <AttributeList
                                  typeId={type.typeId}
                                  attributes={type.attributes}
                                  onAttributeToggle={handleAttributeToggle}
                                  selectedAttributes={selectedAttributes[type.typeId] || new Set()}
                                  onDeleteAttribute={handleDeleteAttribute}
                                />
                            ) : (
                                <Text fontSize="sm" color="gray.500" fontStyle="italic">No custom attributes defined.</Text>
                            )}
                        </Accordion.ItemContent>
                      </Accordion.Item>
                    ))}
                  </Accordion.Root>
                </>
              )}
            </Box>
          )}
        </GridItem>

        <GridItem>
          <VStack align="stretch" spacing={3} position="sticky" top={4}>
            <Card.Root variant="outline">
              <Card.Body>
                  <Heading as="h2" size="md" mb={3}>
                      File History
                  </Heading>
                  <FileHistory
                      history={fileHistory}
                      currentFileId={currentFileId}
                      onSelectFile={handleSelectFile}
                      onDeleteFile={handleDeleteFile}
                  />
              </Card.Body>
            </Card.Root>

            {checkboxTree && (
              <Card.Root variant="outline">
                <Card.Body>
                    <HStack justify="space-between" mb={3}>
                        <Heading as="h2" size="md">
                            Selected Attributes
                        </Heading>
                        <Badge
                            colorPalette={Object.values(selectedAttributes).reduce((sum, set) => sum + set.size, 0) > 0 ? "green" : "gray"}
                            size="sm"
                        >
                            {Object.values(selectedAttributes).reduce((sum, set) => sum + set.size, 0)}
                        </Badge>
                    </HStack>
                    <SelectedAttributes
                        selectedAttributes={selectedAttributes}
                        checkboxTree={checkboxTree}
                        onDeleteType={handleDeleteType}
                        onDeleteAttribute={handleDeleteAttribute}
                    />
                </Card.Body>
              </Card.Root>
            )}

            {checkboxTree && (
              <Card.Root variant="outline">
                <Card.Body>
                    <HStack justify="space-between" mb={3}>
                        <Heading as="h2" size="md">
                            Selected Groups
                        </Heading>
                        <Badge
                            colorPalette={getSelectedGroupsCount() > 0 ? "purple" : "gray"}
                            size="sm"
                        >
                            {getSelectedGroupsCount()}
                        </Badge>
                    </HStack>
                    <SelectedGroups
                        selectedAttributes={selectedAttributes}
                        checkboxTree={checkboxTree}
                    />
                </Card.Body>
              </Card.Root>
            )}

            {checkboxTree && Object.values(selectedAttributes).reduce((sum, set) => sum + set.size, 0) > 0 && (
              <Card.Root variant="outline">
                <Card.Body>
                    <Heading as="h2" size="md" mb={3}>
                        Export
                    </Heading>
                    <VStack spacing={2}>
                        <Button
                            width="100%"
                            colorPalette="blue"
                            variant="solid"
                            onClick={handleExportFull}
                        >
                            Full XML
                        </Button>
                        <Button
                            width="100%"
                            colorPalette="blue"
                            variant="outline"
                            onClick={handleExportPartial}
                        >
                            Partial XML
                        </Button>
                    </VStack>
                </Card.Body>
              </Card.Root>
            )}
          </VStack>
        </GridItem>
      </Grid>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        snippet={getExportXML()}
        exportType={exportType}
        selectedAttributes={selectedAttributes}
        checkboxTree={checkboxTree}
      />
    </Box>
  );
};

export default XMLCheckboxTree;
