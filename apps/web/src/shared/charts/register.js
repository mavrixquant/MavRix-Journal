// apps/web/src/shared/charts/register.js
//
// Side-effect import: registers the Chart.js controllers/elements we use.
// Import this ONCE from main.jsx — nowhere else.

import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  RadarController,
  RadialLinearScale,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  RadarController,
  RadialLinearScale,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);