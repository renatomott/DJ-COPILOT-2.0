
import type { Track } from '../types';

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function getLastSubfolderFromLocation(location: string): string {
  if (!location) return 'N/A';
  try {
    const decodedPath = decodeURIComponent(location);
    const path = decodedPath.replace(/^file:\/\/localhost/, '');
    const lastSlashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    if (lastSlashIndex === -1) {
      return 'N/A';
    }
    const directoryPath = path.substring(0, lastSlashIndex);
    const parts = directoryPath.split(/[/\\]/);
    const lastPart = parts.pop();
    return lastPart || 'N/A';
  } catch (e) {
    console.error('Error parsing location URI:', e);
    return 'N/A';
  }
}

function parseColor(colorAttr: string | null): string | undefined {
  if (!colorAttr) return undefined;
  if (colorAttr.startsWith('0x')) {
    return '#' + colorAttr.substring(2);
  }
  return undefined;
}


export const parseRekordboxXml = (xmlString: string): Track[] => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    const errorNode = xmlDoc.querySelector('parsererror');
    if (errorNode) {
      console.error('XML Parsing Error:', errorNode.textContent);
      return [];
    }
    
    const trackNodes = xmlDoc.querySelectorAll('COLLECTION > TRACK');

    const tracks: Track[] = [];
    trackNodes.forEach((node) => {
      const key = node.getAttribute('Tonality') || 'N/A';
      const bpmValue = parseFloat(node.getAttribute('AverageBpm') || '0');
      const bpm = isNaN(bpmValue) ? '0.00' : bpmValue.toFixed(2);
      const durationInSeconds = parseFloat(node.getAttribute('TotalTime') || '0');
      const locationURI = node.getAttribute('Location') || '';
      const genre = node.getAttribute('Genre') || 'N/A';
      const album = node.getAttribute('Album') || 'N/A';
      const name = node.getAttribute('Name') || 'Unknown Track';
      const color = parseColor(node.getAttribute('Colour'));

      // Simple heuristic for samples
      const isSample = durationInSeconds < 60 || 
                       genre.toLowerCase().includes('sample') || 
                       album.toLowerCase().includes('sample') ||
                       genre.toLowerCase().includes('loop');

      tracks.push({
        id: node.getAttribute('TrackID') || `track-${Math.random()}`,
        name: name,
        artist: node.getAttribute('Artist') || 'Unknown Artist',
        bpm: bpm,
        key: key,
        genre: genre,
        album: album,
        playCount: parseInt(node.getAttribute('PlayCount') || '0', 10),
        rating: parseInt(node.getAttribute('Rating') || '0', 10),
        duration: formatDuration(durationInSeconds),
        location: getLastSubfolderFromLocation(locationURI),
        isSample: isSample,
        color: color,
      });
    });

    return tracks;
  } catch (e) {
    console.error("Error parsing Rekordbox XML:", e);
    return [];
  }
};
