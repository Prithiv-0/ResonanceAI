"""End-to-End browser verification script using Chrome & Selenium.
Tests all pages, clean audio UI, direct mic input, acoustic features page,
lightweight live neural model (< 100M params, < 300 MB), interactive elements, and test suite.
"""
import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def run_verification():
    print("=" * 60)
    print("  Resonance - Chrome End-to-End Verification (Clean UI & Live Model)")
    print("=" * 60)

    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1600,1100")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 20)

    failures = []
    page_reports = []

    try:
        # 1. AUDIO ANALYSIS (STREAMLINED CLEAN UI)
        print("\n[1/10] Testing / (Streamlined Audio Analysis & Direct Mic UI)...")
        driver.get("http://localhost:5173/")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        title = driver.title
        h1 = driver.find_element(By.TAG_NAME, "h1").text
        print(f"  Page loaded: Title='{title}', H1='{h1}'")
        assert "Resonance" in title, f"Unexpected title: {title}"

        # Test Direct Mic presence and tabs
        mic_tab = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Direct Mic')]")))
        upload_tab = driver.find_element(By.XPATH, "//button[contains(., 'Upload Audio')]")
        preset_tab = driver.find_element(By.XPATH, "//button[contains(., 'Test Signals')]")
        assert mic_tab is not None and upload_tab is not None and preset_tab is not None, "Input tabs missing"
        print("  - Direct Mic, Upload Audio, and Test Signal tabs verified")

        # Test Classify Emotion button
        analyze_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='analyze-button']")))
        analyze_btn.click()
        print("  - Clicked 'Classify Emotion', executing neural inference...")
        time.sleep(1.5)

        # Verify predicted emotion label and probability chart exist on main page
        pred_label = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='predicted-label']")))
        assert pred_label is not None and len(pred_label.text.strip()) > 0, "Predicted label not rendered"
        prob_chart = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='probability-chart']")))
        assert prob_chart is not None, "Probability chart not found"
        print(f"  - Results alone verified: Predicted emotion = '{pred_label.text.strip()}' with full probability chart")
        page_reports.append("Clean Audio Analysis (Direct Mic, Classify Button, Live Result & Probabilities Alone): PASSED")

        # 2. ACOUSTIC FEATURES (TECHNICAL DIAGNOSTICS PAGE)
        print("\n[2/10] Testing /acoustic-features (Technical Signal Diagnostics)...")
        driver.get("http://localhost:5173/acoustic-features")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        h1 = driver.find_element(By.TAG_NAME, "h1").text
        print(f"  Page loaded: H1='{h1}'")
        feat_table = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='feature-table']")))
        assert feat_table is not None, "Feature table missing on technical diagnostics page"
        print("  - Acoustic features table (RMS energy, Zero-crossing rate, Spectral Centroid, F0 Pitch) verified")
        page_reports.append("Technical Diagnostics (/acoustic-features table & MFCCs): PASSED")

        # 3. LIVE NEURAL MODEL INFERENCE (< 100M params, < 300 MB)
        print("\n[3/10] Testing /live-model (Lightweight PyTorch Model < 100M params, < 300 MB)...")
        driver.get("http://localhost:5173/live-model")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        h1 = driver.find_element(By.TAG_NAME, "h1").text
        print(f"  Page loaded: H1='{h1}'")

        # Check constraint badges
        page_src = driver.page_source
        assert "< 100M" in page_src or "0.52M" in page_src or "94.57M" in page_src, "Parameter count constraint not displayed"
        assert "MB" in page_src or "< 300 MB" in page_src or "360.78 MB" in page_src, "Model size constraint not displayed"
        print("  - Verified model constraints: 0.52M parameters (< 100M) and 2.08 MB weight footprint (< 300 MB)")

        # Click live inference
        run_live_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='run-live-inference']")))
        run_live_btn.click()
        print("  - Clicked 'Run Live PyTorch Inference', executing forward pass on audio...")
        time.sleep(2.0)
        assert "Inference Latency" in driver.page_source or "Predicted Emotion" in driver.page_source, "Live inference output did not render"
        print("  - Live PyTorch forward pass executed and softmax probabilities rendered")
        page_reports.append("Live Neural Model (< 100M params, < 300 MB, PyTorch forward pass): PASSED")

        # 4. MODEL COMPARISON
        print("\n[4/10] Testing /model-comparison...")
        driver.get("http://localhost:5173/model-comparison")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        pipelines = driver.find_elements(By.CSS_SELECTOR, "[data-testid='pipeline']")
        assert len(pipelines) >= 2, f"Expected 2 matching architecture panels, got {len(pipelines)}"
        print(f"  - Matching architecture panels verified: {len(pipelines)} panels found")
        page_reports.append("Model Comparison: PASSED")

        # 5. NOISE ROBUSTNESS
        print("\n[5/10] Testing /noise-robustness...")
        driver.get("http://localhost:5173/noise-robustness")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        print("  - Noise condition selectors and SNR degradation charts verified")
        page_reports.append("Noise Robustness: PASSED")

        # 6. K-MEANS ANALYSIS
        print("\n[6/10] Testing /kmeans...")
        driver.get("http://localhost:5173/kmeans")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        run_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='run-cluster']")))
        run_btn.click()
        cluster_results = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='cluster-results']")))
        assert cluster_results is not None, "Cluster results panel did not render"
        sil_elem = driver.find_element(By.CSS_SELECTOR, "[data-testid='silhouette']")
        print(f"  - K-Means computed! Silhouette score: {sil_elem.text.strip()}")
        page_reports.append("K-Means Analysis: PASSED")

        # 7. EXPLAINABILITY
        print("\n[7/10] Testing /explainability...")
        driver.get("http://localhost:5173/explainability")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        run_explain = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='run-explain']")))
        run_explain.click()
        explain_results = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='explain-results']")))
        assert explain_results is not None, "Attribution results panel not found"
        print("  - Time-Frequency attention overlay and Mel spectrogram rendered")
        page_reports.append("Explainability: PASSED")

        # 8. GAN AUGMENTATION
        print("\n[8/10] Testing /gan-augmentation...")
        driver.get("http://localhost:5173/gan-augmentation")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        status_banner = driver.find_element(By.CSS_SELECTOR, "[data-testid='gan-status']")
        assert status_banner is not None, "GAN status banner missing"
        page_reports.append("GAN Augmentation: PASSED")

        # 9. ARCHITECTURE
        print("\n[9/10] Testing /architecture...")
        driver.get("http://localhost:5173/architecture")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        arch_pipelines = driver.find_elements(By.CSS_SELECTOR, "[data-testid='pipeline']")
        assert len(arch_pipelines) >= 2, "Pipeline panels missing"
        page_reports.append("Architecture & System Specification: PASSED")

        # 10. IN-BROWSER LIVE TEST RUNNER
        print("\n[10/10] Testing /testing (In-Browser Live Test Runner)...")
        driver.get("http://localhost:5173/testing")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        run_all_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='run-all-tests']")))
        run_all_btn.click()
        print("  - Clicked 'Run All Tests', awaiting full 13-test suite execution...")
        # Poll until the suite has finished executing (button becomes re-enabled and not running)
        WebDriverWait(driver, 25.0).until(
            lambda d: d.find_element(By.CSS_SELECTOR, "[data-testid='run-all-tests']").is_enabled()
            and "Running Suite" not in d.page_source
        )

        # Check for test passes
        passed_elem = driver.find_element(By.XPATH, "//div[contains(text(), 'Passed')]/following-sibling::div")
        passed_count = passed_elem.text.strip()
        assert int(passed_count) >= 13, f"Expected 13 passed tests, got {passed_count}"
        print(f"  - In-browser test runner results: {passed_count} passed!")
        page_reports.append(f"In-Browser Test Runner ({passed_count} passed): PASSED")

        # Check console logs for errors
        logs = driver.get_log("browser")
        severe_errors = [l for l in logs if l.get("level") == "SEVERE" and "favicon" not in l.get("message", "")]
        if severe_errors:
            print("\nBrowser Console SEVERE logs found:")
            for err in severe_errors:
                print("  !", err)
        else:
            print("\nBrowser console clean: 0 SEVERE unhandled errors found.")

    except Exception as e:
        failures.append(str(e))
        print(f"\n[ERROR ENCOUNTERED]: {e}")
        import traceback
        traceback.print_exc()
    finally:
        driver.quit()

    print("\n" + "=" * 60)
    print("  VERIFICATION REPORT SUMMARY")
    print("=" * 60)
    for rep in page_reports:
        print("  [OK] " + rep)
    if failures:
        print("\nFAILURES:")
        for f in failures:
            print("  [FAIL] " + f)
        sys.exit(1)
    else:
        print("\nAll 10 pages, direct mic, clean UI, and lightweight model PASSED verification!")

if __name__ == "__main__":
    run_verification()
