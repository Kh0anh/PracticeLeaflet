export const MAP_CONFIG = {
  base: {
    id: 'base-hanoi',
    name: 'Trung tam dieu hanh Ha Noi',
    description: 'Diem tham chieu khi mo ban do',
    position: [21.027763, 105.83416],
  },
  defaultZoom: 13,
  stops: [
    {
      id: 'hn-lotte',
      name: 'Lotte Center',
      description: 'Toa nha van phong va thuong mai hien dai',
      position: [21.031455, 105.814155],
    },
    {
      id: 'hn-old-quarter',
      name: 'Pho co Ha Noi',
      description: 'Khu pho di bo soi dong',
      position: [21.035233, 105.849907],
    },
    {
      id: 'hn-west-lake',
      name: 'Ho Tay',
      description: 'Danh thang noi bat cua thu do',
      position: [21.050534, 105.82106],
    },
    {
      id: 'hn-vinmart',
      name: 'Vincom Mega Mall Times City',
      description: 'Trung tam thuong mai phia nam thanh pho',
      position: [20.997878, 105.869053],
    },
    {
      id: 'hn-my-dinh',
      name: 'San van dong My Dinh',
      description: 'Khu the thao quoc gia',
      position: [21.020444, 105.765208],
    },
  ],
  trafficPresets: {
    light: {
      label: 'Thong thoang',
      color: '#4caf50',
      speedKmh: 55,
    },
    moderate: {
      label: 'Trung binh',
      color: '#ffb300',
      speedKmh: 35,
    },
    heavy: {
      label: 'Un tac',
      color: '#e53935',
      speedKmh: 15,
    },
  },
  roadNetwork: [
    { from: 'hn-lotte', to: 'hn-old-quarter', traffic: 'moderate' },
    { from: 'hn-lotte', to: 'hn-west-lake', traffic: 'light' },
    { from: 'hn-lotte', to: 'hn-my-dinh', traffic: 'moderate' },
    { from: 'hn-old-quarter', to: 'hn-west-lake', traffic: 'moderate' },
    { from: 'hn-old-quarter', to: 'hn-vinmart', traffic: 'heavy' },
    { from: 'hn-west-lake', to: 'hn-my-dinh', traffic: 'light' },
    { from: 'hn-vinmart', to: 'hn-my-dinh', traffic: 'moderate' },
  ],
};
