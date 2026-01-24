import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import XMLCheckboxTree from "./XMLCheckboxTree";


function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <XMLCheckboxTree />
    </ChakraProvider>
  );
}

export default App;
