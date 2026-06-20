export interface Color {
  name: string;
  hex: string;
}

export interface Collection {
  id: string;
  season: string;
  tag: 'tendencia' | 'nueva' | 'clasicos';
  descEs: string;
  descCa: string;
  colors: Color[];
}

export const collections: Collection[] = [
  {
    id: 'verano-2026',
    season: 'Verano 2026',
    tag: 'tendencia',
    descEs: 'Colores vibrantes y atrevidos para los días de calor. Coral, fucsia y turquesa dominan esta temporada.',
    descCa: 'Colors vibrants i atrevits per als dies de calor. Coral, fúcsia i turquesa dominen aquesta temporada.',
    colors: [
      { name: 'Coral Sunset',      hex: '#FF6347' },
      { name: 'Mango Sorbet',      hex: '#FF9F45' },
      { name: 'Fucsia Ibiza',      hex: '#E91E8C' },
      { name: 'Turquesa Playa',    hex: '#00BFA5' },
      { name: 'Blanco Arena',      hex: '#F0EBE0' },
      { name: 'Lima Refrescante',  hex: '#BADF57' },
    ],
  },
  {
    id: 'primavera-2026',
    season: 'Primavera 2026',
    tag: 'nueva',
    descEs: 'Tonos suaves y frescos que celebran el renacer de la estación. El lila y el melocotón son los protagonistas.',
    descCa: 'Tons suaus i frescos que celebren el renaixement de l\'estació. El lila i el préssec són els protagonistes.',
    colors: [
      { name: 'Lila Bloom',        hex: '#C3A3D4' },
      { name: 'Verde Pistache',    hex: '#A3C972' },
      { name: 'Melocotón Velvet',  hex: '#FFBF9B' },
      { name: 'Rosa Malva',        hex: '#F0A0BA' },
      { name: 'Azul Celeste',      hex: '#AED9E0' },
      { name: 'Mantequilla',       hex: '#FFF0A0' },
    ],
  },
  {
    id: 'otono-2026',
    season: 'Otoño 2026',
    tag: 'clasicos',
    descEs: 'Tonos profundos y cálidos que abrazan la llegada del otoño. Burdeos, terracota y ciruela como señas de identidad.',
    descCa: 'Tons profunds i càlids que abracen l\'arribada de la tardor. Bordeus, terrissa i pruna com a senyes d\'identitat.',
    colors: [
      { name: 'Terracota',         hex: '#C1694F' },
      { name: 'Burdeos',           hex: '#800020' },
      { name: 'Caramelo',          hex: '#C68642' },
      { name: 'Verde Bosque',      hex: '#2D6A4F' },
      { name: 'Ciruela',           hex: '#6B2F77' },
      { name: 'Nude Cacao',        hex: '#C4956A' },
    ],
  },
];
