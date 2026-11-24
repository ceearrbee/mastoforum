import { useParams } from 'react-router-dom';
import Thread from './Thread';

/** Keys Thread by id so /thread/A to /thread/B remounts it and drops reply state. */
export default function ThreadRoute() {
  const { id } = useParams<{ id: string }>();
  return <Thread key={id} />;
}
