import { BACnetPoint } from './types';

export const mockBACnetPoints: BACnetPoint[] = [
  // AHU-1 Points
  {
    id: 'ahu1-oat',
    dis: 'AHU-1 Outside Air Temperature',
    bacnetCur: 'AHU-1:OAT',
    bacnetDis: 'OutsideAirTemp',
    bacnetDesc: 'Outside Air Temperature Sensor',
    navName: 'OAT',
    kind: 'Number',
    unit: '°F',
    vendor: 'Johnson Controls',
    model: 'VMA1400',
    equipRef: null,
    fileName: 'AHU-1_ERV-1.trio.txt',
    markers: ['point', 'sensor', 'cur', 'his'],
    source: 'read(point)',
    status: 'unassigned'
  },
  {
    id: 'ahu1-sat',
    dis: 'AHU-1 Supply Air Temperature',
    bacnetCur: 'AHU-1:SAT',
    kind: 'Number',
    unit: '°F',
    vendor: 'Johnson Controls',
    model: 'VMA1400',
    equipRef: null,
    fileName: 'AHU-1_ERV-1.trio.txt',
    status: 'unassigned'
  },
  {
    id: 'ahu1-sfcmd',
    dis: 'AHU-1 Supply Fan Command',
    bacnetCur: 'AHU-1:SF_CMD',
    kind: 'Bool',
    unit: null,
    vendor: 'Johnson Controls',
    model: 'VMA1400',
    equipRef: null,
    fileName: 'AHU-1_ERV-1.trio.txt',
    status: 'unassigned'
  },
  {
    id: 'ahu1-saf',
    dis: 'AHU-1 Supply Air Flow',
    bacnetCur: 'AHU-1:SAF',
    kind: 'Number',
    unit: 'CFM',
    vendor: 'Johnson Controls',
    model: 'VMA1400',
    equipRef: null,
    fileName: 'AHU-1_ERV-1.trio.txt',
    status: 'unassigned'
  },
  {
    id: 'ahu1-oadpr',
    dis: 'AHU-1 Outside Air Damper Position',
    bacnetCur: 'AHU-1:OAD_POS',
    kind: 'Number',
    unit: '%',
    vendor: 'Johnson Controls',
    model: 'VMA1400',
    equipRef: null,
    fileName: 'AHU-1_ERV-1.trio.txt',
    status: 'unassigned'
  },

  // VAV-101 Points
  {
    id: 'vav101-zat',
    dis: 'VAV-101 Zone Air Temperature',
    bacnetCur: 'VAV-101:ZAT',
    kind: 'Number',
    unit: '°F',
    vendor: 'Siemens',
    model: 'POL909',
    equipRef: null,
    fileName: 'VAV_Terminal_Unit_101.trio',
    status: 'unassigned'
  },
  {
    id: 'vav101-zatsp',
    dis: 'VAV-101 Zone Air Temperature Setpoint',
    bacnetCur: 'VAV-101:ZAT_SP',
    kind: 'Number',
    unit: '°F',
    vendor: 'Siemens',
    model: 'POL909',
    equipRef: null,
    fileName: 'VAV_Terminal_Unit_101.trio',
    status: 'unassigned'
  },
  {
    id: 'vav101-flow',
    dis: 'VAV-101 Air Flow',
    bacnetCur: 'VAV-101:FLOW',
    kind: 'Number',
    unit: 'CFM',
    vendor: 'Siemens',
    model: 'POL909',
    equipRef: null,
    fileName: 'VAV_Terminal_Unit_101.trio',
    status: 'unassigned'
  },
  {
    id: 'vav101-dpos',
    dis: 'VAV-101 Damper Position',
    bacnetCur: 'VAV-101:DAMPER_POS',
    kind: 'Number',
    unit: '%',
    vendor: 'Siemens',
    model: 'POL909',
    equipRef: null,
    fileName: 'VAV_Terminal_Unit_101.trio',
    status: 'unassigned'
  },

  // VAV-102 Points
  {
    id: 'vav102-zat',
    dis: 'VAV-102 Zone Air Temperature',
    bacnetCur: 'VAV-102:ZAT',
    kind: 'Number',
    unit: '°F',
    vendor: 'Siemens',
    model: 'POL909',
    equipRef: null,
    fileName: 'VAV_Terminal_Unit_102.trio',
    status: 'unassigned'
  },
  {
    id: 'vav102-zatsp',
    dis: 'VAV-102 Zone Air Temperature Setpoint',
    bacnetCur: 'VAV-102:ZAT_SP',
    kind: 'Number',
    unit: '°F',
    vendor: 'Siemens',
    model: 'POL909',
    equipRef: null,
    fileName: 'VAV_Terminal_Unit_102.trio',
    status: 'unassigned'
  },
  {
    id: 'vav102-flow',
    dis: 'VAV-102 Air Flow',
    bacnetCur: 'VAV-102:FLOW',
    kind: 'Number',
    unit: 'CFM',
    vendor: 'Siemens',
    model: 'POL909',
    equipRef: null,
    fileName: 'VAV_Terminal_Unit_102.trio',
    status: 'unassigned'
  },

  // Terminal Unit Points
  {
    id: 'tu201-zat',
    dis: 'TU-201 Zone Air Temperature',
    bacnetCur: 'TU-201:ZAT',
    kind: 'Number',
    unit: '°F',
    equipRef: null,
    fileName: 'Terminal_Unit_201.trio',
    status: 'unassigned'
  },
  {
    id: 'tu201-valve',
    dis: 'TU-201 Hot Water Valve Position',
    bacnetCur: 'TU-201:HWV_POS',
    kind: 'Number',
    unit: '%',
    equipRef: null,
    fileName: 'Terminal_Unit_201.trio',
    status: 'unassigned'
  },

  // Unstructured Points (should remain unassigned)
  {
    id: 'misc-sensor1',
    dis: 'Miscellaneous Sensor 1',
    bacnetCur: 'MISC:SENSOR1',
    kind: 'Number',
    unit: '°F',
    equipRef: null,
    fileName: 'misc_points.trio',
    status: 'unassigned'
  },
  {
    id: 'misc-sensor2',
    dis: 'Miscellaneous Sensor 2',
    bacnetCur: 'MISC:SENSOR2',
    kind: 'Bool',
    unit: null,
    equipRef: null,
    fileName: 'misc_points.trio',
    status: 'unassigned'
  }
];