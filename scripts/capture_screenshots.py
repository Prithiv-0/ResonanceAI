"""Capture actual screenshots of the running Resonance application across all views."""
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS_DIR = ROOT / "screenshots"
SCREENSHOTS_DIR.mkdir(exist_ok=True)

def capture_all():
    print(f"Capturing screenshots to: {SCREENSHOTS_DIR}")
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1600,1200")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 15)

    try:
        # 1. Audio Analysis (run analyze to show results & features)
        print("Capturing 01_audio_analysis.png...")
        driver.get("http://localhost:5173/")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='analyze-button']")))
        btn.click()
        time.sleep(2.0)
        driver.save_screenshot(str(SCREENSHOTS_DIR / "01_audio_analysis.png"))

        # 2. Model Comparison
        print("Capturing 02_model_comparison.png...")
        driver.get("http://localhost:5173/model-comparison")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        time.sleep(1.0)
        driver.save_screenshot(str(SCREENSHOTS_DIR / "02_model_comparison.png"))

        # 3. Noise Robustness
        print("Capturing 03_noise_robustness.png...")
        driver.get("http://localhost:5173/noise-robustness")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        run_noise = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='run-noise']")))
        run_noise.click()
        time.sleep(2.5)
        driver.save_screenshot(str(SCREENSHOTS_DIR / "03_noise_robustness.png"))

        # 4. K-Means Analysis
        print("Capturing 04_kmeans_clustering.png...")
        driver.get("http://localhost:5173/kmeans")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        run_cluster = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='run-cluster']")))
        run_cluster.click()
        time.sleep(2.0)
        driver.save_screenshot(str(SCREENSHOTS_DIR / "04_kmeans_clustering.png"))

        # 5. Explainability
        print("Capturing 05_explainability.png...")
        driver.get("http://localhost:5173/explainability")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        run_exp = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='run-explain']")))
        run_exp.click()
        time.sleep(2.5)
        driver.save_screenshot(str(SCREENSHOTS_DIR / "05_explainability.png"))

        # 6. GAN Augmentation
        print("Capturing 06_gan_augmentation.png...")
        driver.get("http://localhost:5173/gan-augmentation")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        time.sleep(1.0)
        driver.save_screenshot(str(SCREENSHOTS_DIR / "06_gan_augmentation.png"))

        # 7. Testing Suite
        print("Capturing 07_testing_suite.png...")
        driver.get("http://localhost:5173/testing")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        run_all = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='run-all-tests']")))
        run_all.click()
        WebDriverWait(driver, 25.0).until(
            lambda d: d.find_element(By.CSS_SELECTOR, "[data-testid='run-all-tests']").is_enabled()
            and "Running Suite" not in d.page_source
        )
        driver.save_screenshot(str(SCREENSHOTS_DIR / "07_testing_suite.png"))


        # 8. Architecture
        print("Capturing 08_architecture.png...")
        driver.get("http://localhost:5173/architecture")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        time.sleep(1.0)
        driver.save_screenshot(str(SCREENSHOTS_DIR / "08_architecture.png"))

        # 9. Dedicated Acoustic Features
        print("Capturing 09_acoustic_features.png...")
        driver.get("http://localhost:5173/acoustic-features")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        time.sleep(1.0)
        driver.save_screenshot(str(SCREENSHOTS_DIR / "09_acoustic_features.png"))

        # 10. Live Model Inference (<100M)
        print("Capturing 10_live_model_inference.png...")
        driver.get("http://localhost:5173/live-model")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        run_live = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='run-live-inference']")))
        run_live.click()
        time.sleep(2.0)
        driver.save_screenshot(str(SCREENSHOTS_DIR / "10_live_model_inference.png"))

        print("All screenshots successfully captured!")
    finally:
        driver.quit()

if __name__ == "__main__":
    capture_all()
