import type { OrganisationType } from '@shared/constants'
import { stableUuid } from './ids'

/**
 * Fictional organisations (brief §15). Display names start with "Demo". The two pseudo
 * organisations make "Independent professional" and "Not currently employed" selectable (§4).
 */
export type OrganisationSeed = {
  id: string
  code: string
  name: string
  type: OrganisationType
  city: string
  isPseudo: boolean
}

type Definition = readonly [name: string, type: OrganisationType, city: string]

const DEFINITIONS: readonly Definition[] = [
  // Hotel or accommodation
  ['Demo Pearl Hospitality', 'hotel_accommodation', 'Doha'],
  ['Demo Gulf Palm Hotels', 'hotel_accommodation', 'Doha'],
  ['Demo Lusail Grand Suites', 'hotel_accommodation', 'Lusail'],
  ['Demo Corniche Residences', 'hotel_accommodation', 'Doha'],
  ['Demo Souq Boutique Hotels', 'hotel_accommodation', 'Doha'],
  ['Demo Desert Rose Resorts', 'hotel_accommodation', 'Sealine'],
  ['Demo Marina Bay Hospitality', 'hotel_accommodation', 'The Pearl'],
  ['Demo Al Wakrah Stay', 'hotel_accommodation', 'Al Wakrah'],
  // Tour operators
  ['Demo Horizon Tours', 'tour_operator', 'Doha'],
  ['Demo Dune and Dhow Expeditions', 'tour_operator', 'Doha'],
  ['Demo Heritage Trails', 'tour_operator', 'Al Zubarah'],
  ['Demo Falcon Adventures', 'tour_operator', 'Al Khor'],
  ['Demo Oasis Journeys', 'tour_operator', 'Doha'],
  // Transport
  ['Demo City Mobility', 'transport', 'Doha'],
  ['Demo Gulf Coaches', 'transport', 'Doha'],
  ['Demo Metro Link Shuttles', 'transport', 'Lusail'],
  ['Demo Harbour Ferries', 'transport', 'Doha'],
  // Travel trade
  ['Demo Coastal Travel', 'travel_trade', 'Doha'],
  ['Demo Silk Route Travel Agency', 'travel_trade', 'Doha'],
  ['Demo Meridian Destination Services', 'travel_trade', 'West Bay'],
  // Attractions and venues
  ['Demo Heritage Venue', 'attraction_venue', 'Doha'],
  ['Demo Pearl Aquarium', 'attraction_venue', 'The Pearl'],
  ['Demo Skyline Observatory', 'attraction_venue', 'West Bay'],
  // Public sector and education (available in the registration list)
  ['Demo Visitor Services Authority', 'public_sector', 'Doha'],
  ['Demo Municipal Tourism Office', 'public_sector', 'Al Rayyan'],
  ['Demo Hospitality Institute', 'education', 'Doha'],
  ['Demo Tourism College', 'education', 'Education City'],
  // Other
  ['Demo Community Events', 'other', 'Doha'],
  ['Demo Cultural Foundation', 'other', 'Doha'],
]

export const PSEUDO_INDEPENDENT = 'Independent professional'
export const PSEUDO_UNEMPLOYED = 'Not currently employed'

export function buildOrganisations(): OrganisationSeed[] {
  const named = DEFINITIONS.map(([name, type, city], index) => ({
    id: stableUuid('organisation', index + 1),
    code: `ORG${String(index + 1).padStart(3, '0')}`,
    name,
    type,
    city,
    isPseudo: false,
  }))
  const pseudo: OrganisationSeed[] = [
    {
      id: stableUuid('organisation', 'independent'),
      code: 'ORG-IND',
      name: PSEUDO_INDEPENDENT,
      type: 'independent',
      city: 'Doha',
      isPseudo: true,
    },
    {
      id: stableUuid('organisation', 'unemployed'),
      code: 'ORG-NEE',
      name: PSEUDO_UNEMPLOYED,
      type: 'other',
      city: 'Doha',
      isPseudo: true,
    },
  ]
  return [...named, ...pseudo]
}
