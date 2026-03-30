package com.ska.skaLensBackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@org.springframework.test.context.TestPropertySource(properties = "app.admin.init-enabled=false")
class SkaLensBackendApplicationTests {

    @Test
    void contextLoads() {
    }

}
