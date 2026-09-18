import gzip,json
from pathlib import Path
root=Path('research/city');report=json.loads((root/'building-coverage-report.json').read_text())
report['attribution']=['© OpenStreetMap contributors (ODbL 1.0)','Overture Maps Foundation (building theme: ODbL)','Qian Shi et al., A First High-quality Vector Data of Buildings in East Asian Countries Based on a Comprehensive Large-scale Mapping Framework (2023), CC BY 4.0, https://doi.org/10.5281/zenodo.8174931']
report['download']='/data/building-footprints.geojson.gz'
Path('public/data/building-data-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
with gzip.GzipFile('public/data/building-footprints.geojson.gz','wb',mtime=0) as f:f.write((root/'building.geojson').read_bytes())
m=json.loads((root/'manifest.json').read_text());m['counts']['building']=report['counts']['total'];m['buildingSupplement']={'source':'Overture Maps Foundation','release':report['release'],'added':report['counts']['added']};(root/'manifest.json').write_text(json.dumps(m,ensure_ascii=False))
print('Published derived footprint download and attribution')
