import * as organisationsService from './organisations.service'

export function ping() {
  return { module: 'organisations' as const, status: 'ok' as const }
}

export async function search(query: organisationsService.OrganisationSearch) {
  return { items: await organisationsService.searchOrganisations(query) }
}
