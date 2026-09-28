// apps/web/src/shared/utils/chartConfig.js
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