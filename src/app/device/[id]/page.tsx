import { DeviceDetails } from './device-details';

export default function DeviceDetailsPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  return <DeviceDetails id={params.id} />;
}