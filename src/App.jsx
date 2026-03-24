import dashboardImg from "./assets/dashboard-mock-test.png";
import "./App.css";

function App() {
  return (
    <>
      <div id="tv-container">
        <section id="hero">
          <img
            src={dashboardImg}
            className="dashboard-img"
            alt="Dashboard mock"
          />
        </section>
      </div>
    </>
  );
}

export default App;
