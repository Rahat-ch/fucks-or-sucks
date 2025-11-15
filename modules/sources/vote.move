module votes::vote {
    use std::signer;

    /// Error codes
    const E_NOT_ADMIN: u64 = 1;
    const E_VOTING_CLOSED: u64 = 2;
    const E_NOT_INITIALIZED: u64 = 3;

    /// Resource to store voting state
    struct VotingState has key {
        shayan_fucks: u64,
        shayan_sucks: u64,
        dhai_fucks: u64,
        dhai_sucks: u64,
        admin: address,
        is_closed: bool,
    }

    /// Initialize the voting contract - called automatically on deployment
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);

        move_to(admin, VotingState {
            shayan_fucks: 0,
            shayan_sucks: 0,
            dhai_fucks: 0,
            dhai_sucks: 0,
            admin: admin_addr,
            is_closed: false,
        });
    }

    /// Public function: Add votes to Shayan's fucks count
    public entry fun vote_shayan_fucks(_voter: &signer, amount: u64) acquires VotingState {
        let state = borrow_global_mut<VotingState>(@votes);
        assert!(!state.is_closed, E_VOTING_CLOSED);
        state.shayan_fucks = state.shayan_fucks + amount;
    }

    /// Public function: Add votes to Shayan's sucks count
    public entry fun vote_shayan_sucks(_voter: &signer, amount: u64) acquires VotingState {
        let state = borrow_global_mut<VotingState>(@votes);
        assert!(!state.is_closed, E_VOTING_CLOSED);
        state.shayan_sucks = state.shayan_sucks + amount;
    }

    /// Public function: Add votes to Dhai's fucks count
    public entry fun vote_dhai_fucks(_voter: &signer, amount: u64) acquires VotingState {
        let state = borrow_global_mut<VotingState>(@votes);
        assert!(!state.is_closed, E_VOTING_CLOSED);
        state.dhai_fucks = state.dhai_fucks + amount;
    }

    /// Public function: Add votes to Dhai's sucks count
    public entry fun vote_dhai_sucks(_voter: &signer, amount: u64) acquires VotingState {
        let state = borrow_global_mut<VotingState>(@votes);
        assert!(!state.is_closed, E_VOTING_CLOSED);
        state.dhai_sucks = state.dhai_sucks + amount;
    }

    /// Admin function: Close voting - no more votes allowed after this
    public entry fun close_voting(admin: &signer) acquires VotingState {
        let state = borrow_global_mut<VotingState>(@votes);
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == state.admin, E_NOT_ADMIN);

        state.is_closed = true;
    }

    #[view]
    /// View function: Get Shayan's vote counts
    public fun get_shayan_votes(): (u64, u64) acquires VotingState {
        let state = borrow_global<VotingState>(@votes);
        (state.shayan_fucks, state.shayan_sucks)
    }

    #[view]
    /// View function: Get Dhai's vote counts
    public fun get_dhai_votes(): (u64, u64) acquires VotingState {
        let state = borrow_global<VotingState>(@votes);
        (state.dhai_fucks, state.dhai_sucks)
    }

    #[view]
    /// View function: Get all vote counts
    public fun get_all_votes(): (u64, u64, u64, u64) acquires VotingState {
        let state = borrow_global<VotingState>(@votes);
        (state.shayan_fucks, state.shayan_sucks, state.dhai_fucks, state.dhai_sucks)
    }

    #[view]
    /// View function: Check if voting is closed
    public fun is_voting_closed(): bool acquires VotingState {
        let state = borrow_global<VotingState>(@votes);
        state.is_closed
    }

    #[view]
    /// View function: Get admin address
    public fun get_admin(): address acquires VotingState {
        let state = borrow_global<VotingState>(@votes);
        state.admin
    }
}
