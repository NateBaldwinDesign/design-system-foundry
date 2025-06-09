import {
  Container,
  Text
} from '@chakra-ui/react';
import { useSchema } from '../../hooks/useSchema';


const TokenAnalysis = () => {
  const schema = useSchema();

  return (
    <Container maxW="container.xl" py={8}>
      <Text>{JSON.stringify(schema, null, 2)}</Text>
    </Container>
  );
}; 

export { TokenAnalysis };