import { DeviceDetails } from './device-details';

type Params = Promise<{
  id: string;
}>;

export default async function Page({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  
  return <DeviceDetails id={resolvedParams.id} />;
}