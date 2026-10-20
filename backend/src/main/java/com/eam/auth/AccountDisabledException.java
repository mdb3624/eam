package com.eam.auth;

public class AccountDisabledException extends RuntimeException {

    public AccountDisabledException() {
        super("This account is disabled. Contact your administrator.");
    }
}
