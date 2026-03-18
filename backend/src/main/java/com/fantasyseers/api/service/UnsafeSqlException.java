package com.fantasyseers.api.service;

public class UnsafeSqlException extends RuntimeException {
    public UnsafeSqlException(String message) {
        super(message);
    }
}
