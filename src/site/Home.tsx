export function Home({ supported, checking }: { supported: boolean; checking: boolean }) {
  return <section className="home-simple simple-intro">
    <h1>See Your Gate Before It's Installed.</h1>
    <p>Choose one of the two camera modes above. Upload your gate and follow the steps.</p>
    <p className="device-note"><span className={supported ? 'status-dot supported' : 'status-dot'} />{checking ? 'Checking Live Preview availability…' : supported ? 'Live AR is available on this device' : 'Photo Preview is your starting point. Live AR requires a compatible device.'}</p>
    <div className="button-row"><a className="text-link" href="#/photo">Create a Photo Preview</a><a className="text-link" href="#/catalogue">Choose a gate design</a><a className="text-link" href="#/saved">Saved previews</a></div>
  </section>;
}
