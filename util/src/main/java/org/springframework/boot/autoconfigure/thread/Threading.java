package org.springframework.boot.autoconfigure.thread;

import org.springframework.core.env.Environment;

public enum Threading {
    PLATFORM, VIRTUAL;

    public boolean isActive(Environment environment) {
        if (this == VIRTUAL) {
            return Boolean.parseBoolean(environment.getProperty("spring.threads.virtual.enabled", "false"));
        }
        return true;
    }
}
