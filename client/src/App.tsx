import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PortfolioPage from './pages/PortfolioPage';
import AlbumsPage from './pages/AlbumsPage';
import GroupPage from './pages/GroupPage';
import AlbumPage from './pages/AlbumPage';
import MapPage from './pages/MapPage';
import SearchPage from './pages/SearchPage';
import TagCloudPage from './pages/TagCloudPage';
import StatsPage from './pages/StatsPage';
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PortfolioPage />} />
        <Route path="albums" element={<AlbumsPage />} />
        <Route path="albums/:groupSlug" element={<GroupPage />} />
        <Route path="albums/:groupSlug/:albumSlug" element={<AlbumPage />} />
        <Route path="albums/*" element={<AlbumPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="tags" element={<TagCloudPage />} />
        <Route path="stats" element={<StatsPage />} />
      </Route>
    </Routes>
  );
}
