import { redirect } from 'next/navigation'

export default function VesselAlertsRedirect() {
  redirect('/dashboard/communications#vessel-alerts')
}
